import React, { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

const Quiz = ({ questions, expeditionName }) => {
  if (!questions || questions.length === 0) return null;

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold font-display text-ncpor-primary border-b border-ncpor-border pb-2">
        Test Your Knowledge {expeditionName ? `· ${expeditionName}` : ''}
      </h3>
      {questions.map((q, idx) => (
        <QuizQuestion key={idx} question={q} index={idx} />
      ))}
    </div>
  );
};

const QuizQuestion = ({ question, index }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSelect = (idx) => {
    if (!isSubmitted) {
      setSelectedOption(idx);
    }
  };

  const checkAnswer = () => {
    if (selectedOption !== null) {
      setIsSubmitted(true);
    }
  };

  const isCorrect = selectedOption === question.correct_index;

  return (
    <div className="bg-ncpor-card p-6 rounded-xl shadow-premium border border-ncpor-border">
      <h4 className="font-semibold text-base text-ncpor-primary mb-4">
        {index + 1}. {question.question}
      </h4>
      <div className="space-y-3">
        {question.options.map((opt, idx) => {
          let buttonClass = "w-full text-left p-4 rounded-lg border text-sm transition-all ";
          
          if (!isSubmitted) {
            buttonClass += selectedOption === idx 
              ? "border-ncpor-accent bg-ncpor-accent/15 text-ncpor-primary ring-1 ring-ncpor-accent/40" 
              : "border-ncpor-border bg-ncpor-bgSecondary/60 text-ncpor-secondary hover:border-ncpor-accent/50 hover:bg-ncpor-bgSecondary hover:text-ncpor-primary";
          } else {
            if (idx === question.correct_index) {
              buttonClass += "border-emerald-500/80 bg-emerald-500/15 text-emerald-300 font-medium";
            } else if (idx === selectedOption) {
              buttonClass += "border-red-500/80 bg-red-500/15 text-red-300 font-medium";
            } else {
              buttonClass += "border-ncpor-border bg-ncpor-bgSecondary/30 text-ncpor-muted opacity-50";
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              className={buttonClass}
              disabled={isSubmitted}
            >
              <div className="flex items-center justify-between">
                <span>{opt}</span>
                {isSubmitted && idx === question.correct_index && (
                  <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 ml-2" />
                )}
                {isSubmitted && idx === selectedOption && idx !== question.correct_index && (
                  <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 ml-2" />
                )}
              </div>
            </button>
          );
        })}
      </div>
      
      {!isSubmitted ? (
        <button
          onClick={checkAnswer}
          disabled={selectedOption === null}
          className={`mt-4 px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
            selectedOption !== null
              ? "bg-ncpor-accent text-ncpor-bg hover:opacity-90 shadow-md"
              : "bg-ncpor-bgSecondary border border-ncpor-border text-ncpor-muted cursor-not-allowed"
          }`}
        >
          Check Answer
        </button>
      ) : (
        <div className={`mt-6 p-4 rounded-lg flex items-start space-x-3 ${isCorrect ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
          <div className="mt-0.5">
            {isCorrect ? (
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            ) : (
              <XCircle className="h-5 w-5 text-red-400" />
            )}
          </div>
          <div>
            <p className={`font-semibold text-sm ${isCorrect ? 'text-emerald-300' : 'text-red-300'}`}>
              {isCorrect ? 'Correct! 🌟' : 'Incorrect.'}
            </p>
            <p className="text-ncpor-secondary mt-1 text-sm leading-relaxed">{question.explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Quiz;
