import React, { useState, useEffect, useRef } from 'react';
import { Container, Typography, Paper, Button, Grid } from '@mui/material';
import Webcam from 'react-webcam';

function ExamInterface() {
  const webcamRef = useRef(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  return (
    <Container maxWidth="lg" sx={{ mt: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5">Exam Interface</Typography>
            <Typography>Question display and answer input</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Proctoring</Typography>
            <Webcam ref={webcamRef} width="100%" />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default ExamInterface;
