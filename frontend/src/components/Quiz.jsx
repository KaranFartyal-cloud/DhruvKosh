import React, { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

const Quiz = ({ questions }) => {
  if (!questions || questions.length === 0) return null;

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-ocean-800 border-b pb-2">Test Your Knowledge</h3>
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
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h4 className="font-semibold text-lg text-slate-800 mb-4">
        {index + 1}. {question.question}
      </h4>
      <div className="space-y-3">
        {question.options.map((opt, idx) => {
          let buttonClass = "w-full text-left p-4 rounded-lg border transition-all ";
          
          if (!isSubmitted) {
            buttonClass += selectedOption === idx 
              ? "border-ocean-500 bg-ocean-50 ring-2 ring-ocean-200" 
              : "border-slate-200 hover:border-ocean-300 hover:bg-slate-50";
          } else {
            if (idx === question.correct_index) {
              buttonClass += "border-green-500 bg-green-50";
            } else if (idx === selectedOption) {
              buttonClass += "border-red-500 bg-red-50";
            } else {
              buttonClass += "border-slate-200 opacity-50";
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
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                {isSubmitted && idx === selectedOption && idx !== question.correct_index && (
                  <XCircle className="h-5 w-5 text-red-500" />
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
          className={`mt-4 px-6 py-2 rounded-lg font-medium ${
            selectedOption !== null
              ? "bg-ocean-600 text-white hover:bg-ocean-700"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          }`}
        >
          Check Answer
        </button>
      ) : (
        <div className={`mt-6 p-4 rounded-lg flex items-start space-x-3 ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
          <div className="mt-0.5">
            {isCorrect ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-orange-600" />
            )}
          </div>
          <div>
            <p className={`font-medium ${isCorrect ? 'text-green-800' : 'text-orange-800'}`}>
              {isCorrect ? 'Correct!' : 'Incorrect.'}
            </p>
            <p className="text-slate-700 mt-1">{question.explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Quiz;
