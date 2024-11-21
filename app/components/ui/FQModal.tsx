import { Button, Dialog, DialogPanel } from "@headlessui/react";
import { ReactNode } from "react";

export type ModalProps = {
  isOpen: boolean;
  close: () => void;
  children: ({ close }: { close: ModalProps["close"] }) => ReactNode;
};

export const FQModal = ({ isOpen, close, children }: ModalProps) => {
  return (
    <Dialog
      open={isOpen}
      as="div"
      className="relative z-10 focus:outline-none"
      onClose={close}
    >
      <div className="fixed inset-0 z-10 w-screen overflow-y-auto bg-gray-400/50 dark:bg-gray-800/50">
        <div className="flex min-h-full items-center justify-center p-4">
          {children({ close })}
        </div>
      </div>
    </Dialog>
  );
};

FQModal.Body = function Body({
  children,
  close,
}: {
  children: ReactNode;
  close: ModalProps["close"];
}) {
  return (
    <DialogPanel
      transition
      className="w-full max-w-md rounded-xl bg-gray-100 dark:bg-gray-800 shadow-2xl  p-6 duration-300 ease-out data-[closed]:transform-[scale(95%)] data-[closed]:opacity-0"
    >
      {children}
      <div className="mt-4 flex justify-end">
        <Button
          className="inline-flex items-center gap-2 rounded-md bg-gray-700 py-1.5 px-3 text-sm/6 font-semibold text-white shadow-inner shadow-white/10 focus:outline-none data-[hover]:bg-gray-600 data-[focus]:outline-1 data-[focus]:outline-white data-[open]:bg-gray-700"
          onClick={close}
        >
          Close
        </Button>
      </div>
    </DialogPanel>
  );
};

