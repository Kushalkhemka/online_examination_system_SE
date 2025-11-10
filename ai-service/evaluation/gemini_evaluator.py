"""
AI-based Answer Evaluation using Google Gemini 2.5 Pro
Evaluates subjective answers, MCQs, and provides detailed feedback
"""

import os
import logging
from typing import Dict, List, Optional
import google.generativeai as genai

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class GeminiEvaluator:
    """AI-powered answer evaluator using Google Gemini"""

    def __init__(self, api_key: Optional[str] = None):
        """Initialize Gemini API"""
        self.api_key = api_key or os.getenv('GEMINI_API_KEY')

        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not provided")

        genai.configure(api_key=self.api_key)

        # Use Gemini 2.5 Pro model
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')

        logger.info("Gemini Evaluator initialized successfully")

    def evaluate_mcq(
        self,
        question: str,
        student_answer: List[str],
        correct_answer: List[str],
        marks: float
    ) -> Dict:
        """
        Evaluate MCQ or Multi-Correct question
        """
        is_correct = set(student_answer) == set(correct_answer)

        return {
            'is_correct': is_correct,
            'marks_obtained': marks if is_correct else 0,
            'feedback': 'Correct answer!' if is_correct else f'Incorrect. Correct answer(s): {", ".join(correct_answer)}'
        }

    def evaluate_true_false(
        self,
        question: str,
        student_answer: str,
        correct_answer: str,
        marks: float
    ) -> Dict:
        """
        Evaluate True/False question
        """
        is_correct = student_answer.lower() == correct_answer.lower()

        return {
            'is_correct': is_correct,
            'marks_obtained': marks if is_correct else 0,
            'feedback': 'Correct!' if is_correct else f'Incorrect. Correct answer: {correct_answer}'
        }

    def evaluate_subjective(
        self,
        question: str,
        student_answer: str,
        model_answer: Optional[str],
        marks: float,
        rubric: Optional[str] = None
    ) -> Dict:
        """
        Evaluate subjective answer using AI
        Returns marks and detailed feedback
        """
        try:
            # Build evaluation prompt
            prompt = self._build_subjective_evaluation_prompt(
                question,
                student_answer,
                model_answer,
                marks,
                rubric
            )

            # Generate evaluation
            response = self.model.generate_content(prompt)
            result_text = response.text

            # Parse the response
            evaluation = self._parse_evaluation_response(result_text, marks)

            return evaluation

        except Exception as e:
            logger.error(f"Error evaluating subjective answer: {str(e)}")
            return {
                'is_correct': None,
                'marks_obtained': 0,
                'feedback': 'Unable to evaluate answer automatically. Manual review required.',
                'error': str(e)
            }

    def _build_subjective_evaluation_prompt(
        self,
        question: str,
        student_answer: str,
        model_answer: Optional[str],
        total_marks: float,
        rubric: Optional[str]
    ) -> str:
        """Build comprehensive evaluation prompt for Gemini"""

        prompt = f"""You are an experienced university professor evaluating student exam answers.
Evaluate the following answer objectively and provide detailed feedback.

**Question:**
{question}

**Student's Answer:**
{student_answer}
"""

        if model_answer:
            prompt += f"""
**Model/Expected Answer:**
{model_answer}
"""

        if rubric:
            prompt += f"""
**Grading Rubric:**
{rubric}
"""

        prompt += f"""
**Total Marks Available:** {total_marks}

**Instructions:**
1. Evaluate the student's answer based on:
   - Correctness and accuracy of information
   - Completeness of the answer
   - Clarity and coherence
   - Relevance to the question
   - Use of proper terminology and concepts

2. Assign marks out of {total_marks} based on the quality of the answer.

3. Provide your evaluation in the following format:

MARKS: [number out of {total_marks}]
STRENGTHS: [What the student did well]
WEAKNESSES: [What could be improved]
FEEDBACK: [Detailed constructive feedback]

Be fair, objective, and constructive in your evaluation.
"""

        return prompt

    def _parse_evaluation_response(self, response_text: str, total_marks: float) -> Dict:
        """Parse Gemini's evaluation response"""

        try:
            lines = response_text.strip().split('\n')

            marks_obtained = 0
            strengths = ''
            weaknesses = ''
            feedback = ''

            current_section = None

            for line in lines:
                line = line.strip()

                if line.startswith('MARKS:'):
                    marks_str = line.replace('MARKS:', '').strip()
                    # Extract number from string like "8 out of 10" or "8/10" or just "8"
                    import re
                    numbers = re.findall(r'\d+\.?\d*', marks_str)
                    if numbers:
                        marks_obtained = float(numbers[0])
                    current_section = 'marks'

                elif line.startswith('STRENGTHS:'):
                    strengths = line.replace('STRENGTHS:', '').strip()
                    current_section = 'strengths'

                elif line.startswith('WEAKNESSES:'):
                    weaknesses = line.replace('WEAKNESSES:', '').strip()
                    current_section = 'weaknesses'

                elif line.startswith('FEEDBACK:'):
                    feedback = line.replace('FEEDBACK:', '').strip()
                    current_section = 'feedback'

                elif current_section == 'strengths' and line:
                    strengths += ' ' + line

                elif current_section == 'weaknesses' and line:
                    weaknesses += ' ' + line

                elif current_section == 'feedback' and line:
                    feedback += ' ' + line

            # Ensure marks don't exceed total
            marks_obtained = min(marks_obtained, total_marks)

            is_correct = marks_obtained >= (total_marks * 0.5)  # 50% threshold

            full_feedback = f"{feedback}\n\nStrengths: {strengths}\n\nAreas for Improvement: {weaknesses}"

            return {
                'is_correct': is_correct,
                'marks_obtained': marks_obtained,
                'feedback': full_feedback.strip(),
                'strengths': strengths.strip(),
                'weaknesses': weaknesses.strip()
            }

        except Exception as e:
            logger.error(f"Error parsing evaluation response: {str(e)}")
            # Fallback to basic parsing
            return {
                'is_correct': None,
                'marks_obtained': total_marks * 0.5,  # Give 50% by default
                'feedback': response_text
            }

    def evaluate_fill_blank(
        self,
        question: str,
        student_answer: str,
        correct_answers: List[str],
        marks: float
    ) -> Dict:
        """
        Evaluate fill-in-the-blank question
        Accepts multiple possible correct answers
        """
        student_answer_normalized = student_answer.lower().strip()

        is_correct = any(
            student_answer_normalized == correct.lower().strip()
            for correct in correct_answers
        )

        # Use AI for fuzzy matching if direct match fails
        if not is_correct:
            prompt = f"""Evaluate if the student's answer is semantically equivalent to any of the correct answers.

Question: {question}
Student's Answer: {student_answer}
Correct Answers: {', '.join(correct_answers)}

Respond with only "YES" if the answer is correct or semantically equivalent, or "NO" if it's incorrect.
"""
            try:
                response = self.model.generate_content(prompt)
                is_correct = 'yes' in response.text.lower()
            except:
                pass

        return {
            'is_correct': is_correct,
            'marks_obtained': marks if is_correct else 0,
            'feedback': 'Correct!' if is_correct else f'Incorrect. Accepted answers: {", ".join(correct_answers)}'
        }

    def evaluate_answer(
        self,
        question_type: str,
        question_text: str,
        student_answer: str,
        correct_answer: any,
        marks: float,
        explanation: Optional[str] = None
    ) -> Dict:
        """
        Universal evaluation method that routes to appropriate evaluator
        """
        if question_type == 'mcq':
            return self.evaluate_mcq(
                question_text,
                [student_answer] if isinstance(student_answer, str) else student_answer,
                correct_answer if isinstance(correct_answer, list) else [correct_answer],
                marks
            )

        elif question_type == 'multi_correct':
            return self.evaluate_mcq(
                question_text,
                student_answer if isinstance(student_answer, list) else [student_answer],
                correct_answer,
                marks
            )

        elif question_type == 'true_false':
            return self.evaluate_true_false(
                question_text,
                student_answer,
                correct_answer,
                marks
            )

        elif question_type == 'subjective':
            return self.evaluate_subjective(
                question_text,
                student_answer,
                explanation,  # Use explanation as model answer
                marks
            )

        elif question_type == 'fill_blank':
            correct_answers = correct_answer if isinstance(correct_answer, list) else [correct_answer]
            return self.evaluate_fill_blank(
                question_text,
                student_answer,
                correct_answers,
                marks
            )

        else:
            return {
                'is_correct': None,
                'marks_obtained': 0,
                'feedback': f'Unknown question type: {question_type}'
            }

    def batch_evaluate(self, questions_and_answers: List[Dict]) -> List[Dict]:
        """
        Evaluate multiple answers in batch
        """
        results = []

        for item in questions_and_answers:
            result = self.evaluate_answer(
                question_type=item['question_type'],
                question_text=item['question_text'],
                student_answer=item['student_answer'],
                correct_answer=item['correct_answer'],
                marks=item['marks'],
                explanation=item.get('explanation')
            )

            results.append({
                'question_id': item['question_id'],
                **result
            })

        return results
