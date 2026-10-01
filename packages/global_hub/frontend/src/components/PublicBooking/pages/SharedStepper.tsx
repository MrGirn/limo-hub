import React from 'react';
import { Check } from 'lucide-react';

interface Props {
  currentStep: number; // 1: Ride details, 2: Passenger details, 3: Review & pay, 4: Confirmation
  onStepClick?: (step: number) => void;
}

export const SharedStepper: React.FC<Props> = ({ currentStep, onStepClick }) => {
  const steps = [
    { num: 1, label: 'Ride details' },
    { num: 2, label: 'Passenger details' },
    { num: 3, label: 'Review & pay' },
    { num: 4, label: 'Confirmation' }
  ];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '18px',
      padding: '24px 0 32px 0'
    }}>
      {steps.map((step, idx) => {
        const isCompleted = currentStep > step.num;
        const isActive = currentStep === step.num;

        return (
          <React.Fragment key={step.num}>
            <div
              onClick={() => onStepClick && onStepClick(step.num)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: onStepClick ? 'pointer' : 'default'
              }}
            >
              {/* Circle Icon */}
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: isActive || isCompleted ? '#1D68FE' : '#FFFFFF',
                border: isActive || isCompleted ? 'none' : '1.5px solid #D1D5DB',
                color: isActive || isCompleted ? '#FFFFFF' : '#6B7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '700'
              }}>
                {isCompleted ? <Check size={14} strokeWidth={3} /> : step.num}
              </div>

              {/* Label */}
              <span style={{
                fontSize: '13px',
                fontWeight: isActive ? '700' : '500',
                color: isActive || isCompleted ? '#1D68FE' : '#9CA3AF'
              }}>
                {step.label}
              </span>
            </div>

            {/* Connecting line */}
            {idx < steps.length - 1 && (
              <div style={{
                width: '36px',
                height: '1.5px',
                background: currentStep > step.num ? '#1D68FE' : '#E5E7EB'
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
