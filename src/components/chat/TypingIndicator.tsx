export function TypingIndicator() {
  return (
    <div className="flex justify-start mt-1">
      <div className="bg-[hsl(var(--bubble-in))] text-[hsl(var(--bubble-in-fg))] rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-1">
          <span
            className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <span
            className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <span
            className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  )
}
