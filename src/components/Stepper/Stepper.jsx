import { createContext, useContext, Children } from 'react';
import { Check } from 'lucide-react';
import styles from './Stepper.module.css';

const StepperContext = createContext(null);

function useStepperCtx() {
  const ctx = useContext(StepperContext);
  if (!ctx) throw new Error('Stepper sub-component must be used inside <Stepper>');
  return ctx;
}

/* ── Root ── */
function Stepper({ currentStep, children }) {
  return (
    <StepperContext.Provider value={{ currentStep }}>
      <div className={styles.stepper}>
        {children}
      </div>
    </StepperContext.Provider>
  );
}

/* ── Step indicator ── */
function Step({ index, label }) {
  const { currentStep } = useStepperCtx();
  const isDone    = index < currentStep;
  const isActive  = index === currentStep;

  return (
    <div className={`${styles.step} ${isActive ? styles.active : ''} ${isDone ? styles.done : ''}`}>
      <div className={styles.indicator}>
        {isDone ? (
          <Check size={14} strokeWidth={2.5} />
        ) : (
          <span>{index + 1}</span>
        )}
      </div>
      <span className={styles.label}>{label}</span>
      {/* Connector line — hidden for last step */}
      <div className={`${styles.connector} ${isDone ? styles.connectorDone : ''}`} />
    </div>
  );
}

/* ── Content (renders children[currentStep]) ── */
function Content({ children }) {
  const { currentStep } = useStepperCtx();
  const steps = Children.toArray(children);
  return (
    <div className={styles.content} key={currentStep}>
      {steps[currentStep] ?? null}
    </div>
  );
}

Stepper.Step    = Step;
Stepper.Content = Content;

export default Stepper;
