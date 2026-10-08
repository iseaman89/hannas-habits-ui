import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/shared/api';
import { applyServerError } from '@/shared/lib/formErrors';
import { Button, Field, Input } from '@/shared/ui';
import { registerSchema, type RegisterValues } from './credentials';
import { FormMessage } from './FormMessage';

interface RegisterFormProps {
  /** Rejects with the `ApiError` of a failed attempt; resolves once the session has started. */
  onSubmit: (values: RegisterValues) => Promise<unknown>;
  /** Another sign-in (Google) is under way: no second attempt. */
  disabled?: boolean;
}

const FIELDS = ['displayName', 'email', 'password'] as const;

export function RegisterForm({ onSubmit, disabled }: RegisterFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: '', email: '', password: '' },
  });
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const submit = handleSubmit(async (values) => {
    setFormMessage(null);
    try {
      await onSubmit(values);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        // "The email address is already in use": the one thing to change is the email.
        setError('email', { type: 'server', message: error.message }, { shouldFocus: true });
        return;
      }
      setFormMessage(applyServerError(error, setError, FIELDS));
    }
  });

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
      <Field label="Your name" hint="Optional." error={errors.displayName?.message}>
        {(control) => <Input autoComplete="name" {...control} {...register('displayName')} />}
      </Field>
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
            autoComplete="new-password"
            {...control}
            {...register('password')}
          />
        )}
      </Field>
      <FormMessage message={formMessage} />
      <Button type="submit" block loading={isSubmitting} disabled={disabled}>
        Create account
      </Button>
    </form>
  );
}
