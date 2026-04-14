"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Leaf } from 'lucide-react';

export function AgeVerification() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const verified = localStorage.getItem('age_verified');
    if (!verified) {
      setOpen(true);
    }
  }, []);

  const handleVerify = (isOver21: boolean) => {
    if (isOver21) {
      localStorage.setItem('age_verified', 'true');
      setOpen(false);
    } else {
      window.location.href = 'https://www.google.com';
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md bg-black border-green-600 border-2"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="flex flex-col items-center text-center space-y-6 py-6">
          <div className="bg-green-600 p-4 rounded-full">
            <Leaf className="h-12 w-12 text-white" />
          </div>

          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Age Verification</h2>
            <p className="text-gray-400">
              This website contains cannabis products.
            </p>
          </div>

          <div className="w-full space-y-3">
            <p className="text-white text-lg font-semibold">
              Are you 21 years or older?
            </p>

            <div className="flex gap-3">
              <Button
                onClick={() => handleVerify(true)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white h-12 text-lg"
              >
                Yes, I'm 21+
              </Button>
              <Button
                onClick={() => handleVerify(false)}
                variant="outline"
                className="flex-1 border-red-600 text-red-600 hover:bg-red-600 hover:text-white h-12 text-lg"
              >
                No
              </Button>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            By entering this site, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
