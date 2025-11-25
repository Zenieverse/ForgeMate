import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, PatchProposal } from '../types';

const FORGEMATE_SYSTEM_INSTRUCTION = `You are ForgeMate, an autonomous software development agent.
Your mandate is to reduce debugging time by automating the CI failure -> fix -> PR loop.

CORE CAPABILITIES:
1. CI Failure Intelligence: Parse logs, identify root cause, detect flakiness.
2. Sandbox Execution: Reproduce failures in isolated environments.
3. Patch & Test Generation: Generate minimal, safe, verifiable code fixes and verification tests.
4. Pull Request Builder: Create clear, auditable PRs.
5. Safety Guardrails: Never modify infra/secrets without approval. Verify all patches.

TOOLS & ACTIONS:
- GitHub API: Create branches, push commits.
- Filesystem: Edit code, create tests.
- Docker: Run isolated steps.
- Command Execution: Run linters, tests.

When analyzing:
- Identify probable root cause.
- Provide evidence from logs.
- Suggest minimal changes.

When patching:
- Generate safe patches.
- Add verification tests.
- Explain reasoning clearly.
`;

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY not found in environment.");
  }
  return new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });
};

export const analyzeFailure = async (
  logs: string,
  repoContext: string
): Promise<AnalysisResult> => {
  const ai = getAiClient();
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze the following CI failure logs and repository context.
      
      Repo Context: ${repoContext}
      
      Logs:
      ${logs.substring(0, 20000)}
      
      Identify the root cause, providing a confidence score (0-1), the suspected file needing changes, and the specific log evidence.`,
      config: {
        systemInstruction: FORGEMATE_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rootCause: { type: Type.STRING, description: "A concise technical explanation of the failure." },
            confidence: { type: Type.NUMBER, description: "Confidence score between 0.0 and 1.0" },
            suspectedFile: { type: Type.STRING, description: "Relative path to the file causing the issue." },
            evidence: { type: Type.STRING, description: "The specific log line or error message used as proof." }
          },
          required: ["rootCause", "confidence", "suspectedFile", "evidence"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AnalysisResult;
    }
    throw new Error("No response from Gemini");
  } catch (error) {
    console.error("Analysis failed:", error);
    return {
      rootCause: "Analysis failed due to API error. Falling back to manual triage.",
      confidence: 0,
      suspectedFile: "Unknown",
      evidence: "N/A"
    };
  }
};

export const generatePatch = async (
  analysis: AnalysisResult,
  codeContext: string
): Promise<PatchProposal> => {
  const ai = getAiClient();

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a minimal, safe patch for the following issue.
      
      Issue: ${analysis.rootCause}
      File: ${analysis.suspectedFile}
      Current Code Content:
      ${codeContext}
      
      Provide the fix, an explanation, and a verification test case.`,
      config: {
        systemInstruction: FORGEMATE_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: { type: Type.STRING, description: "Why this patch fixes the root cause." },
            file: { type: Type.STRING },
            diff: { type: Type.STRING, description: "A unified diff string showing changes." },
            verificationTest: { type: Type.STRING, description: "Code for a new unit test to verify the fix." }
          },
          required: ["explanation", "file", "diff", "verificationTest"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as PatchProposal;
    }
    throw new Error("No response from Gemini");
  } catch (error) {
    console.error("Patch generation failed:", error);
    return {
      explanation: "Failed to generate patch.",
      file: analysis.suspectedFile,
      diff: "",
      verificationTest: ""
    };
  }
};

export const chatWithAgent = async (history: {role: 'user' | 'model', content: string}[], message: string): Promise<string> => {
    const ai = getAiClient();
    try {
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: FORGEMATE_SYSTEM_INSTRUCTION
            },
            history: history.map(h => ({
                role: h.role,
                parts: [{ text: h.content }]
            }))
        });
        
        const response = await chat.sendMessage({ message });
        return response.text || "I couldn't process that.";
    } catch (e) {
        console.error(e);
        return "Error connecting to agent brain.";
    }
}