import { signIn } from "next-auth/react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type SignInModalProps = {
  close: () => void;
  isOpen: boolean;
};

export const SignInModal = ({ close, isOpen }: SignInModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-sm">
        <div className="flex flex-col gap-4">
          <h1 className="text-xl font-semibold text-foreground">
            Sign in first to start marking.
          </h1>
          <div>
            <Button
              className="bg-green-700 hover:bg-green-600 text-white"
              onClick={() => signIn()}
            >
              Sign in
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
