import { signIn } from "next-auth/react";
import { FQModal } from "./ui/FQModal";

export type SignInModalProps = {
  close: () => void;
  isOpen: boolean;
};

export const SignInModal = ({ close, isOpen }: SignInModalProps) => {
  return (
    <FQModal isOpen={isOpen} close={close}>
      <FQModal.Body close={close}>
        <div className="flex flex-col gap-4">
          <h1 className="text-xl font-semibold text-black dark:text-white">
            Sign in first to start marking.
          </h1>
          <div>
            <button
              className="inline-flex items-center gap-2 rounded-md bg-green-700 py-1.5 px-3 text-sm/6 font-semibold text-white shadow-inner shadow-white/10 focus:outline-none hover:bg-green-600 focus:outline-1 focus:outline-white"
              onClick={() => signIn()}
            >
              Sign in
            </button>
          </div>
        </div>
      </FQModal.Body>
    </FQModal>
  );
};

