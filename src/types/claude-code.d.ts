/**
 * Type declarations untuk global modules yang di-import secara dynamic
 * Claude Code SDK terinstall secara global (npm install -g)
 * sehingga TypeScript tidak bisa resolve module declarations-nya
 */

declare module '@anthropic-ai/claude-code' {
    export function claude(
        prompt: string,
        options?: {
            cwd?: string;
            model?: string;
            maxTokens?: number;
        }
    ): Promise<{ stdout: string }>;
}
