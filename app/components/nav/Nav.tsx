"use client"

export const Nav = () => {
    return (
        <nav className="bg-white dark:bg-black text-black dark:text-white px-4 shadow dark:shadow-slate-600 h-14 flex items-center">
            <button onClick={() => document.documentElement.classList.toggle('dark')}>
                Toggle Dark Mode
            </button>
        </nav>
    )
}
