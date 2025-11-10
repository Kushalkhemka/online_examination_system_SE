"""
Proctoring Detection Module
Uses MediaPipe and OpenCV for face detection and tracking
"""

import cv2
import numpy as np
import mediapipe as mp
import base64
from typing import Dict, List, Tuple
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ProctoringDetector:
    """AI-powered proctoring detector for exam monitoring"""

    def __init__(self):
        # Initialize MediaPipe Face Detection
        self.mp_face_detection = mp.solutions.face_detection
        self.mp_face_mesh = mp.solutions.face_mesh
        self.mp_hands = mp.solutions.hands
        self.mp_pose = mp.solutions.pose

        # Initialize detectors
        self.face_detection = self.mp_face_detection.FaceDetection(
            model_selection=1,
            min_detection_confidence=0.5
        )
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            max_num_faces=5,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.hands = self.mp_hands.Hands(
            max_num_hands=4,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )

        # Tracking variables
        self.face_absent_frames = 0
        self.looking_away_frames = 0
        self.multiple_faces_frames = 0
        self.suspicious_hand_frames = 0

        # Thresholds
        self.FACE_ABSENT_THRESHOLD = 30  # frames (~1 second at 30fps)
        self.LOOKING_AWAY_THRESHOLD = 60  # frames (~2 seconds)
        self.MULTIPLE_FACES_THRESHOLD = 15  # frames
        self.SUSPICIOUS_HAND_THRESHOLD = 45  # frames

    def decode_image(self, base64_image: str) -> np.ndarray:
        """Decode base64 image to numpy array"""
        try:
            # Remove data URL prefix if present
            if ',' in base64_image:
                base64_image = base64_image.split(',')[1]

            img_data = base64.b64decode(base64_image)
            nparr = np.frombuffer(img_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            return image
        except Exception as e:
            logger.error(f"Error decoding image: {str(e)}")
            return None

    def detect_faces(self, image: np.ndarray) -> Tuple[int, List[Dict]]:
        """
        Detect faces in the image
        Returns: (face_count, face_details)
        """
        if image is None:
            return 0, []

        # Convert BGR to RGB
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        # Detect faces
        results = self.face_detection.process(rgb_image)

        faces = []
        if results.detections:
            for detection in results.detections:
                bboxC = detection.location_data.relative_bounding_box
                ih, iw, _ = image.shape
                bbox = {
                    'x': int(bboxC.xmin * iw),
                    'y': int(bboxC.ymin * ih),
                    'width': int(bboxC.width * iw),
                    'height': int(bboxC.height * ih)
                }
                faces.append({
                    'bbox': bbox,
                    'confidence': detection.score[0]
                })

        return len(faces), faces

    def analyze_face_orientation(self, image: np.ndarray) -> Dict:
        """
        Analyze face orientation using face mesh
        Returns looking direction and gaze metrics
        """
        if image is None:
            return {'looking_away': True, 'reason': 'invalid_image'}

        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(rgb_image)

        if not results.multi_face_landmarks:
            return {'looking_away': True, 'reason': 'no_face_detected'}

        # Get first face landmarks
        face_landmarks = results.multi_face_landmarks[0]

        # Get key landmarks for gaze detection
        # Nose tip: 1, Left eye: 33, Right eye: 263
        # Chin: 152, Forehead: 10

        landmarks = face_landmarks.landmark
        nose = np.array([landmarks[1].x, landmarks[1].y, landmarks[1].z])
        left_eye = np.array([landmarks[33].x, landmarks[33].y, landmarks[33].z])
        right_eye = np.array([landmarks[263].x, landmarks[263].y, landmarks[263].z])

        # Calculate face orientation
        eye_center = (left_eye + right_eye) / 2
        face_vector = nose - eye_center

        # Check if looking away (simple threshold-based)
        # Horizontal threshold for looking left/right
        horizontal_threshold = 0.15
        vertical_threshold = 0.1

        looking_left = face_vector[0] < -horizontal_threshold
        looking_right = face_vector[0] > horizontal_threshold
        looking_down = face_vector[1] > vertical_threshold
        looking_up = face_vector[1] < -vertical_threshold

        looking_away = looking_left or looking_right or looking_down or looking_up

        direction = 'center'
        if looking_left:
            direction = 'left'
        elif looking_right:
            direction = 'right'
        elif looking_down:
            direction = 'down'
        elif looking_up:
            direction = 'up'

        return {
            'looking_away': looking_away,
            'direction': direction,
            'horizontal_angle': float(face_vector[0]),
            'vertical_angle': float(face_vector[1])
        }

    def detect_hands(self, image: np.ndarray) -> Dict:
        """
        Detect hands in the frame
        Returns hand count and positions
        """
        if image is None:
            return {'hand_count': 0, 'hands': []}

        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = self.hands.process(rgb_image)

        hands_data = []
        if results.multi_hand_landmarks:
            for hand_landmarks, handedness in zip(
                results.multi_hand_landmarks,
                results.multi_handedness
            ):
                # Get hand position (center of palm)
                palm_landmarks = [hand_landmarks.landmark[i] for i in [0, 5, 9, 13, 17]]
                palm_center = np.mean([[lm.x, lm.y] for lm in palm_landmarks], axis=0)

                hands_data.append({
                    'handedness': handedness.classification[0].label,
                    'position': {
                        'x': float(palm_center[0]),
                        'y': float(palm_center[1])
                    },
                    'confidence': handedness.classification[0].score
                })

        return {
            'hand_count': len(hands_data),
            'hands': hands_data
        }

    def detect_mobile_phone(self, image: np.ndarray) -> Dict:
        """
        Detect mobile phone in the frame
        This is a simplified version - in production, use a trained object detection model
        """
        # For MVP, we'll use color-based detection as a placeholder
        # In production, replace with YOLOv8 or similar trained model

        if image is None:
            return {'detected': False}

        # Simple edge detection to find rectangular objects
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        # Look for rectangular contours (potential phone)
        phone_detected = False
        for contour in contours:
            area = cv2.contourArea(contour)
            if area > 5000:  # Minimum area threshold
                peri = cv2.arcLength(contour, True)
                approx = cv2.approxPolyDP(contour, 0.04 * peri, True)

                # Check if contour is rectangular
                if len(approx) == 4:
                    x, y, w, h = cv2.boundingRect(approx)
                    aspect_ratio = float(w) / h
                    # Phone aspect ratios typically between 0.4 and 0.7
                    if 0.3 < aspect_ratio < 0.8:
                        phone_detected = True
                        break

        return {
            'detected': phone_detected,
            'confidence': 0.6 if phone_detected else 0.0
        }

    def analyze_frame(self, base64_image: str, session_id: str) -> Dict:
        """
        Main method to analyze a proctoring frame
        Returns all violations detected
        """
        violations = []

        # Decode image
        image = self.decode_image(base64_image)
        if image is None:
            return {
                'violations': [{
                    'type': 'invalid_frame',
                    'severity': 'low',
                    'description': 'Failed to decode image frame',
                    'metadata': {}
                }]
            }

        # 1. Face Detection
        face_count, faces = self.detect_faces(image)

        if face_count == 0:
            self.face_absent_frames += 1
            if self.face_absent_frames > self.FACE_ABSENT_THRESHOLD:
                violations.append({
                    'type': 'no_face',
                    'severity': 'critical',
                    'description': 'No face detected in frame',
                    'metadata': {
                        'duration_frames': self.face_absent_frames
                    }
                })
        else:
            self.face_absent_frames = 0

        if face_count > 1:
            self.multiple_faces_frames += 1
            if self.multiple_faces_frames > self.MULTIPLE_FACES_THRESHOLD:
                violations.append({
                    'type': 'multiple_faces',
                    'severity': 'critical',
                    'description': f'Multiple faces detected ({face_count})',
                    'metadata': {
                        'face_count': face_count,
                        'duration_frames': self.multiple_faces_frames
                    }
                })
        else:
            self.multiple_faces_frames = 0

        # 2. Face Orientation Analysis
        if face_count == 1:
            orientation = self.analyze_face_orientation(image)
            if orientation['looking_away']:
                self.looking_away_frames += 1
                if self.looking_away_frames > self.LOOKING_AWAY_THRESHOLD:
                    violations.append({
                        'type': 'looking_away',
                        'severity': 'high',
                        'description': f'Student looking {orientation["direction"]}',
                        'metadata': {
                            'direction': orientation['direction'],
                            'duration_frames': self.looking_away_frames
                        }
                    })
            else:
                self.looking_away_frames = 0

        # 3. Hand Detection
        hands_result = self.detect_hands(image)
        if hands_result['hand_count'] > 2:
            self.suspicious_hand_frames += 1
            if self.suspicious_hand_frames > self.SUSPICIOUS_HAND_THRESHOLD:
                violations.append({
                    'type': 'person_detected',
                    'severity': 'critical',
                    'description': f'Suspicious: {hands_result["hand_count"]} hands detected',
                    'metadata': {
                        'hand_count': hands_result['hand_count']
                    }
                })
        else:
            self.suspicious_hand_frames = 0

        # 4. Mobile Phone Detection
        phone_result = self.detect_mobile_phone(image)
        if phone_result['detected']:
            violations.append({
                'type': 'mobile_detected',
                'severity': 'critical',
                'description': 'Mobile phone detected in frame',
                'metadata': {
                    'confidence': phone_result['confidence']
                }
            })

        return {
            'violations': violations,
            'analysis': {
                'face_count': face_count,
                'hands_count': hands_result['hand_count']
            }
        }

    def reset_counters(self):
        """Reset all frame counters"""
        self.face_absent_frames = 0
        self.looking_away_frames = 0
        self.multiple_faces_frames = 0
        self.suspicious_hand_frames = 0
