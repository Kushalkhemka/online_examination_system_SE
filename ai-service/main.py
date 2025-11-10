"""
AI Service for Online Examination System
FastAPI-based service for proctoring detection and AI evaluation
"""

import os
import logging
from typing import Dict, List, Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import requests

from proctoring.detector import ProctoringDetector
from evaluation.gemini_evaluator import GeminiEvaluator

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Online Examination System - AI Service",
    description="AI-powered proctoring and evaluation service",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
try:
    proctoring_detector = ProctoringDetector()
    logger.info("✅ Proctoring detector initialized")
except Exception as e:
    logger.error(f"❌ Failed to initialize proctoring detector: {str(e)}")
    proctoring_detector = None

try:
    gemini_evaluator = GeminiEvaluator(api_key=os.getenv('GEMINI_API_KEY'))
    logger.info("✅ Gemini evaluator initialized")
except Exception as e:
    logger.error(f"❌ Failed to initialize Gemini evaluator: {str(e)}")
    gemini_evaluator = None

# Pydantic models
class FrameAnalysisRequest(BaseModel):
    session_id: str
    frame_data: str  # Base64 encoded image


class FrameAnalysisResponse(BaseModel):
    violations: List[Dict]
    analysis: Optional[Dict] = None


class EvaluationRequest(BaseModel):
    attempt_id: str


class AnswerEvaluationRequest(BaseModel):
    question_id: str
    question_type: str
    question_text: str
    student_answer: str
    correct_answer: any
    marks: float
    explanation: Optional[str] = None


class BatchEvaluationRequest(BaseModel):
    answers: List[AnswerEvaluationRequest]


# API Endpoints

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "Online Examination System - AI Service",
        "status": "running",
        "proctoring_available": proctoring_detector is not None,
        "evaluation_available": gemini_evaluator is not None
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "services": {
            "proctoring": "available" if proctoring_detector else "unavailable",
            "evaluation": "available" if gemini_evaluator else "unavailable"
        }
    }


@app.post("/proctoring/analyze-frame", response_model=FrameAnalysisResponse)
async def analyze_proctoring_frame(request: FrameAnalysisRequest):
    """
    Analyze a single proctoring frame for violations
    """
    if not proctoring_detector:
        raise HTTPException(status_code=503, detail="Proctoring service unavailable")

    try:
        result = proctoring_detector.analyze_frame(
            request.frame_data,
            request.session_id
        )

        return FrameAnalysisResponse(**result)

    except Exception as e:
        logger.error(f"Frame analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/evaluate")
async def evaluate_exam_attempt(
    request: EvaluationRequest,
    background_tasks: BackgroundTasks
):
    """
    Evaluate an entire exam attempt
    Runs in background and updates database
    """
    if not gemini_evaluator:
        raise HTTPException(status_code=503, detail="Evaluation service unavailable")

    # Run evaluation in background
    background_tasks.add_task(
        evaluate_attempt_background,
        request.attempt_id
    )

    return {
        "message": "Evaluation started",
        "attempt_id": request.attempt_id
    }


async def evaluate_attempt_background(attempt_id: str):
    """
    Background task to evaluate an exam attempt
    """
    try:
        logger.info(f"Starting evaluation for attempt: {attempt_id}")

        # Fetch attempt data from backend
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_KEY')

        if not supabase_url or not supabase_key:
            logger.error("Supabase credentials not configured")
            return

        headers = {
            'apikey': supabase_key,
            'Authorization': f'Bearer {supabase_key}',
            'Content-Type': 'application/json'
        }

        # Get student answers
        answers_response = requests.get(
            f"{supabase_url}/rest/v1/student_answers",
            headers=headers,
            params={
                'attempt_id': f'eq.{attempt_id}',
                'select': '*,questions(*,question_options(*))'
            }
        )

        if answers_response.status_code != 200:
            logger.error(f"Failed to fetch answers: {answers_response.text}")
            return

        answers = answers_response.json()

        total_marks = 0
        obtained_marks = 0

        # Evaluate each answer
        for answer in answers:
            question = answer['questions']
            question_type = question['question_type']

            # Prepare correct answer based on question type
            if question_type in ['mcq', 'multi_correct', 'true_false']:
                correct_options = [
                    opt['id'] for opt in question['question_options']
                    if opt['is_correct']
                ]
                correct_answer = correct_options
            else:
                correct_answer = question.get('explanation', '')

            # Evaluate answer
            evaluation = gemini_evaluator.evaluate_answer(
                question_type=question_type,
                question_text=question['question_text'],
                student_answer=answer.get('answer_text') or answer.get('selected_option_ids', []),
                correct_answer=correct_answer,
                marks=float(question['marks']),
                explanation=question.get('explanation')
            )

            # Update answer in database
            update_data = {
                'is_correct': evaluation['is_correct'],
                'marks_obtained': evaluation['marks_obtained'],
                'ai_evaluation_score': evaluation['marks_obtained'],
                'ai_evaluation_feedback': evaluation['feedback'],
                'is_reviewed': True
            }

            update_response = requests.patch(
                f"{supabase_url}/rest/v1/student_answers",
                headers=headers,
                params={'id': f"eq.{answer['id']}"},
                json=update_data
            )

            if update_response.status_code not in [200, 204]:
                logger.error(f"Failed to update answer {answer['id']}: {update_response.text}")

            total_marks += float(question['marks'])
            obtained_marks += evaluation['marks_obtained']

        # Calculate percentage
        percentage = (obtained_marks / total_marks * 100) if total_marks > 0 else 0

        # Get passing marks from exam
        attempt_response = requests.get(
            f"{supabase_url}/rest/v1/exam_attempts",
            headers=headers,
            params={
                'id': f'eq.{attempt_id}',
                'select': 'exams(passing_marks)'
            }
        )

        passing_marks = 0
        if attempt_response.status_code == 200:
            attempt_data = attempt_response.json()
            if attempt_data and len(attempt_data) > 0:
                passing_marks = attempt_data[0]['exams'].get('passing_marks', 0)

        is_passed = obtained_marks >= passing_marks if passing_marks else percentage >= 40

        # Update attempt with results
        attempt_update = {
            'total_marks': total_marks,
            'obtained_marks': obtained_marks,
            'percentage': percentage,
            'is_passed': is_passed
        }

        update_attempt_response = requests.patch(
            f"{supabase_url}/rest/v1/exam_attempts",
            headers=headers,
            params={'id': f"eq.{attempt_id}"},
            json=attempt_update
        )

        if update_attempt_response.status_code in [200, 204]:
            logger.info(f"✅ Evaluation completed for attempt {attempt_id}: {obtained_marks}/{total_marks} ({percentage:.2f}%)")
        else:
            logger.error(f"Failed to update attempt: {update_attempt_response.text}")

    except Exception as e:
        logger.error(f"Error during evaluation: {str(e)}")


@app.post("/evaluate-answer")
async def evaluate_single_answer(request: AnswerEvaluationRequest):
    """
    Evaluate a single answer
    """
    if not gemini_evaluator:
        raise HTTPException(status_code=503, detail="Evaluation service unavailable")

    try:
        evaluation = gemini_evaluator.evaluate_answer(
            question_type=request.question_type,
            question_text=request.question_text,
            student_answer=request.student_answer,
            correct_answer=request.correct_answer,
            marks=request.marks,
            explanation=request.explanation
        )

        return {
            "success": True,
            "evaluation": evaluation
        }

    except Exception as e:
        logger.error(f"Answer evaluation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/evaluate-batch")
async def evaluate_batch_answers(request: BatchEvaluationRequest):
    """
    Evaluate multiple answers in batch
    """
    if not gemini_evaluator:
        raise HTTPException(status_code=503, detail="Evaluation service unavailable")

    try:
        answers_data = [
            {
                'question_id': ans.question_id,
                'question_type': ans.question_type,
                'question_text': ans.question_text,
                'student_answer': ans.student_answer,
                'correct_answer': ans.correct_answer,
                'marks': ans.marks,
                'explanation': ans.explanation
            }
            for ans in request.answers
        ]

        results = gemini_evaluator.batch_evaluate(answers_data)

        return {
            "success": True,
            "results": results
        }

    except Exception as e:
        logger.error(f"Batch evaluation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))

    print("\n" + "=" * 60)
    print("🤖 AI Service for Online Examination System")
    print("=" * 60)
    print(f"📡 Server starting on port: {port}")
    print(f"🔍 Proctoring: {'Enabled' if proctoring_detector else 'Disabled'}")
    print(f"🧠 AI Evaluation: {'Enabled' if gemini_evaluator else 'Disabled'}")
    print("=" * 60 + "\n")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True
    )
