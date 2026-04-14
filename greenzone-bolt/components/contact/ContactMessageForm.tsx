'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const SUPPORT_EMAIL = 'support@datreehouse.com';

export function ContactMessageForm() {
  const [pending, setPending] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim();
    const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim();
    const subject = (form.elements.namedItem('subject') as HTMLInputElement).value.trim();
    const message = (form.elements.namedItem('message') as HTMLTextAreaElement).value.trim();

    if (!email || !message) {
      return;
    }

    setPending(true);
    const subj = subject || 'Contact form';
    const body = `Name: ${name || '(not provided)'}\nReply-To: ${email}\n\n${message}`;
    const href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
    setTimeout(() => setPending(false), 1500);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <Label htmlFor="contact-name" className="text-gray-300">
          Name
        </Label>
        <Input
          id="contact-name"
          name="name"
          placeholder="Your name"
          autoComplete="name"
          className="border-green-900/40 bg-black/60 text-white placeholder:text-gray-500"
        />
      </div>
      <div>
        <Label htmlFor="contact-email" className="text-gray-300">
          Email <span className="text-red-400">*</span>
        </Label>
        <Input
          id="contact-email"
          name="email"
          type="email"
          required
          placeholder="your@email.com"
          autoComplete="email"
          className="border-green-900/40 bg-black/60 text-white placeholder:text-gray-500"
        />
      </div>
      <div>
        <Label htmlFor="contact-subject" className="text-gray-300">
          Subject
        </Label>
        <Input
          id="contact-subject"
          name="subject"
          placeholder="How can we help?"
          className="border-green-900/40 bg-black/60 text-white placeholder:text-gray-500"
        />
      </div>
      <div>
        <Label htmlFor="contact-message" className="text-gray-300">
          Message <span className="text-red-400">*</span>
        </Label>
        <Textarea
          id="contact-message"
          name="message"
          required
          minLength={4}
          placeholder="Tell us more about your inquiry..."
          rows={6}
          className="border-green-900/40 bg-black/60 text-white placeholder:text-gray-500"
        />
      </div>
      <p className="text-xs text-gray-500">
        Opens your email app with a draft to {SUPPORT_EMAIL}. If nothing opens, copy the address and email us directly.
      </p>
      <Button
        className="w-full bg-brand-lime text-black hover:bg-brand-lime-soft"
        size="lg"
        type="submit"
        disabled={pending}
      >
        {pending ? 'Opening mail…' : 'Send message'}
      </Button>
    </form>
  );
}
