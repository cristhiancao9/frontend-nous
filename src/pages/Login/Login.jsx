import { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Loader } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLoginForm } from '../../hooks/useLoginForm';
import styles from './Login.module.css';

function Login() {
  const { isAuthenticated } = useAuth();
  const { form, onSubmit, isLoading, isError } = useLoginForm();
  const { register, formState: { errors } } = form;
  const [showPass, setShowPass] = useState(false);
  const formRef = useRef(null);

  // Shake animation on error
  useEffect(() => {
    if (!isError || !formRef.current) return;
    formRef.current.classList.remove(styles.shake);
    // Force reflow
    void formRef.current.offsetWidth;
    formRef.current.classList.add(styles.shake);
  }, [isError]);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className={styles.page}>
      <div className={styles.card} ref={formRef}>
        {/* Logo */}
        <div className={styles.logoWrap}>
          <div className={styles.logoMark}>N</div>
          <div>
            <h1 className={styles.logoName}>NOUS RETAIL</h1>
            <p className={styles.logoSub}>Sistema de Punto de Venta</p>
          </div>
        </div>

        <form onSubmit={onSubmit} noValidate className={styles.form}>
          {/* Email */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">
              Correo electrónico
            </label>
            <div className={styles.inputWrap}>
              <Mail size={16} className={styles.inputIcon} />
              <input
                id="email"
                type="email"
                className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                placeholder="admin@empresa.com"
                autoComplete="email"
                autoFocus
                {...register('email', {
                  required: 'El correo es obligatorio',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Ingresa un correo válido',
                  },
                })}
              />
            </div>
            {errors.email && (
              <span className={styles.errorMsg}>{errors.email.message}</span>
            )}
          </div>

          {/* Password */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">
              Contraseña
            </label>
            <div className={styles.inputWrap}>
              <Lock size={16} className={styles.inputIcon} />
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                placeholder="••••••••"
                autoComplete="current-password"
                {...register('password', {
                  required: 'La contraseña es obligatoria',
                  minLength: { value: 4, message: 'Mínimo 4 caracteres' },
                })}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPass((v) => !v)}
                tabIndex={-1}
                aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <span className={styles.errorMsg}>{errors.password.message}</span>
            )}
          </div>

          {/* API error */}
          {isError && (
            <div className={styles.apiError}>
              Credenciales incorrectas. Verifica tu correo y contraseña.
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader size={16} className={styles.spinner} />
                Ingresando...
              </>
            ) : (
              'Iniciar sesión'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
