import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button, IconButton } from './Button';
import { buttonClassName } from './buttonStyles';

describe('Button', () => {
  it('is a real button that does not submit a form unless told to', async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button>Cancel</Button>
        <Button type="submit">Save</Button>
      </form>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onSubmit).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('calls onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Go' }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not click while disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Go
      </Button>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Go' }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it('blocks further clicks and says it is busy while loading', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Save' });

    await userEvent.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('is not marked busy when not loading', () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy');
  });
});

describe('IconButton', () => {
  it('takes its accessible name from the label', () => {
    render(
      <IconButton label="Delete habit">
        <svg />
      </IconButton>,
    );

    expect(screen.getByRole('button', { name: 'Delete habit' })).toBeInTheDocument();
  });
});

describe('buttonClassName', () => {
  it('gives a link the look of a button of the variant and size', () => {
    const classes = buttonClassName({ variant: 'secondary', size: 'sm', className: 'extra' });

    expect(classes).toContain('rounded-full');
    expect(classes).toContain('bg-accent-200');
    expect(classes).toContain('h-9');
    expect(classes).toContain('extra');
  });

  it('is the primary medium button by default - the same classes the button itself uses', () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole('button').className).toBe(buttonClassName());
  });
});
