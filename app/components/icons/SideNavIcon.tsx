'use client';

type Props = {
    isOpen: boolean;
};

function IconArrowRight() {
    return (
        <svg
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            viewBox="0 0 24 24"
            className="w-6 h-6"
        >
            <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
    );
}

function IconClose() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
            />
        </svg>
    );
}

export const SideNavIcon = ({ isOpen }: Props) => {
    return isOpen ? <IconClose /> : <IconArrowRight />;
};
