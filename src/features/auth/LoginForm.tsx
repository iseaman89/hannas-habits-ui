import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { applyServerError } from '@/shared/lib/formErrors';
import { Button, Field, Input } from '@/shared/ui';
import { loginSchema, type LoginValues } from './credentials';
import { FormMessage } from './FormMessage';

interface LoginFormProps {
  /** Rejects with the `ApiError` of a failed attempt; resolves once the session has started. */
  onSubmit: (values: LoginValues) => Promise<unknown>;
  /** Another sign-in (Google) is under way: no second attempt. */
  disabled?: boolean;
}

const FIELDS = ['email', 'password'] as const;

export function LoginForm({ onSubmit, disabled }: LoginFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const submit = handleSubmit(async (values) => {
    setFormMessage(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setFormMessage(applyServerError(error, setError, FIELDS));
    }
  });

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
      <Field label="Email" error={errors.email?.message}>
        {(control) => (
          <Input
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            {...control}
            {...register('email')}
          />
        )}
      </Field>
      <Field label="Password" error={errors.password?.message}>
        {(control) => (
          <Input
            type="password"
            autoComplete="current-password"
            {...control}
            {...register('password')}
          />
        )}
      </Field>
      <FormMessage message={formMessage} />
      <Button type="submit" block loading={isSubmitting} disabled={disabled}>
        Log in
      </Button>
    </form>
  );
}
