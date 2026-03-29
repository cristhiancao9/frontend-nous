import { useForm } from 'react-hook-form';
import { useMutation } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { loginRequest } from '../api/auth.api';
import { useAuth } from '../context/AuthContext';

export function useLoginForm() {
  const navigate  = useNavigate();
  const { login } = useAuth();

  const form = useForm({
    defaultValues: { email: '', password: '' },
  });

  const mutation = useMutation(loginRequest, {
    onSuccess: (data) => {
      login(data);           // { token, user }
      navigate('/dashboard', { replace: true });
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    mutation.mutate(values);
  });

  return {
    form,
    onSubmit,
    isLoading: mutation.isLoading,
    isError:   mutation.isError,
    error:     mutation.error,
  };
}
