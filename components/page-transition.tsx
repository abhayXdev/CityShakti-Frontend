"use client"

import { motion, AnimatePresence } from "motion/react"
import { ReactNode } from "react"

interface PageTransitionProps {
    children: ReactNode
    className?: string
}

export function PageTransition({ children, className }: PageTransitionProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{
                duration: 0.4,
                ease: [0.4, 0, 0.2, 1]
            }}
            className={className}
        >
            {children}
        </motion.div>
    )
}
