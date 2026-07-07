import { signIn } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import useTranslations from "@hooks/use-translations";

export type SignInModalProps = {
  close: () => void;
  isOpen: boolean;
};

export const SignInModal = ({ close, isOpen }: SignInModalProps) => {
  const t = useTranslations();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-sm">
        <div className="flex flex-col gap-4">
          <DialogTitle className="text-xl font-semibold leading-normal tracking-normal text-foreground">
            Sign in first to start marking.
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t(
              "signInModal.description",
              "Sign in to mark words and verses in the Quran.",
            )}
          </DialogDescription>
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
