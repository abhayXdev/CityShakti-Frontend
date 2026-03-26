"use client"

import { useState, useRef } from "react"
import { Mic, Square, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface MicButtonProps {
    onTranscriptionComplete: (text: string) => void
    userToken?: string
}

export function MicButton({ onTranscriptionComplete, userToken }: MicButtonProps) {
    const [isRecording, setIsRecording] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)

    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder
            chunksRef.current = []

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data)
            }

            mediaRecorder.onstop = async () => {
                setIsProcessing(true)
                const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" })
                await handleUpload(audioBlob)

                // Stop all tracks to turn off the actual microphone
                stream.getTracks().forEach(track => track.stop())
            }

            mediaRecorder.start()
            setIsRecording(true)
        } catch (err) {
            console.error("Error accessing mic:", err)
            alert("Microphone access is required for voice dictation.")
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
        }
    }

    const handleUpload = async (audioBlob: Blob) => {
        try {
            const formData = new FormData()
            formData.append("file", audioBlob, "recording.webm")

            // Uses the same API base point as the rest of the application
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

            const response = await fetch(`${apiUrl}/api/complaints/transcribe`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${userToken}`,
                },
                body: formData,
            })

            if (!response.ok) {
                throw new Error("Failed to transcribe")
            }

            const data = await response.json()
            if (data.text) {
                onTranscriptionComplete(data.text)
            }
        } catch (error) {
            console.error("Transcription error:", error)
            alert("Failed to transcribe audio. Please try again.")
        } finally {
            setIsProcessing(false)
        }
    }

    if (isProcessing) {
        return (
            <Button
                type="button"
                variant="outline"
                className="w-11 h-11 p-0 rounded-full border-primary/20 bg-primary/5 cursor-not-allowed shrink-0"
                disabled
            >
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </Button>
        )
    }

    return (
        <Button
            type="button"
            variant="outline"
            onClick={isRecording ? stopRecording : startRecording}
            className={cn(
                "w-11 h-11 p-0 rounded-full transition-all duration-300 relative shrink-0",
                isRecording
                    ? "border-destructive/30 bg-destructive/10 hover:bg-destructive/20"
                    : "border-primary/20 bg-primary/5 hover:bg-primary/10"
            )}
            title={isRecording ? "Stop Recording" : "Dictate using AI"}
        >
            {isRecording && (
                <>
                    <span className="absolute inset-0 rounded-full border-2 border-destructive animate-ping opacity-75" />
                    <span className="absolute inset-1 rounded-full border border-destructive animate-pulse opacity-50" />
                </>
            )}
            {isRecording ? (
                <Square className="w-4 h-4 text-destructive fill-destructive" />
            ) : (
                <Mic className="w-5 h-5 text-primary" />
            )}
        </Button>
    )
}
