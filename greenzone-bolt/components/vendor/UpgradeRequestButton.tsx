'use client';

import { useState } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { submitVendorUpgradeRequest } from '@/lib/vendorUpgradeRequest';
import { Loader2 } from 'lucide-react';

type Props = Omit<ButtonProps, 'onClick'> & {
  /** Shown to admins with the request (e.g. plan name or button label). */
  requestContext?: string;
};

/**
 * Any “upgrade” CTA: creates a `vendor_upgrade_requests` row with the signed-in user’s email.
 * Requires migration 0039 + linked vendor; shows toast on failure.
 */
export function UpgradeRequestButton({ requestContext, children, disabled, ...props }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const label = typeof children === 'string' ? children : requestContext;
    const res = await submitVendorUpgradeRequest(
      [requestContext, label].filter(Boolean).join(' — ') || 'Upgrade / plan interest'
    );
    setLoading(false);
    if (res.ok) {
      toast({
        title: 'Request sent',
        description: 'Our team will reach out using the email on your account.',
      });
    } else {
      toast({
        title: 'Could not send request',
        description: res.message,
        variant: 'destructive',
      });
    }
  }

  return (
    <Button {...props} disabled={disabled || loading} onClick={handleClick}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
    </Button>
  );
}
