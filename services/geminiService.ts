import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, PatchProposal, AgentConfig } from '../types';

const FORGEMATE_SYSTEM_INSTRUCTION = `You are ForgeMate, an autonomous software development agent.
Your mandate is to reduce debugging time by automating the CI failure -> fix -> PR loop.

CORE CAPABILITIES:
1. CI Failure Intelligence: Parse logs, identify root cause, detect flakiness vs deterministic breakage.
2. Sandbox Execution: Reproduce failures in isolated environments.
3. Patch & Test Generation: Generate minimal, safe, verifiable code fixes and verification tests.
4. Pull Request Builder: Create clear, auditable PRs.
5. Safety Guardrails: Never modify infra/secrets without approval. Verify all patches.

ADVANCED ANALYTICAL DIRECTIVES:
- Pattern Recognition: Check for recurring failures across multiple runs (e.g., "Matches 3 recent runs").
- Architectural Insight: Suggest architectural improvements if the root cause indicates technical debt.
- Flaky Test Management: Detect non-deterministic behavior. If flaky, suggest retry logic or isolation.
- Dependency Health: Generate automated dependency freshness reports and check for CVEs.
- Regression Prediction: Provide regression prediction estimates (Low/Medium/High) based on historical test data and file coupling.

SAFETY GUARDRAILS (STRICT ENFORCEMENT):
- NEVER modify Infrastructure files (Terraform, Dockerfiles, Kubernetes manifests, Helm charts).
- NEVER modify Secret files (.env, .pem, .key) or code containing hardcoded credentials.
- NEVER modify CI/CD workflow definitions (.github/workflows/*, .gitlab-ci.yml).
- IF the root cause is in a restricted file, STOP and report the analysis only. Do not generate a patch.
- IF a patch requires updating dependencies, flag it clearly.

When analyzing:
- Identify probable root cause with high precision.
- Provide evidence from logs.
- Suggest minimal changes.
- Explicitly populate fields for recurring patterns, architecture, flakiness, dependencies, and regression risk.

When patching:
- Generate safe patches.
- If flaky, introduce determinism or retries.
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
  repoContext: string,
  model: string = "gemini-2.5-flash"
): Promise<AnalysisResult> => {
  const ai = getAiClient();
  
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: `Analyze the following CI failure logs and repository context.
      
      Repo Context: ${repoContext}
      
      Logs:
      ${logs.substring(0, 20000)}
      
      Identify the root cause, providing a confidence score (0-1), the suspected file needing changes, and the specific log evidence.
      Crucially, assess recurring patterns, architectural implications, flaky test probability, dependency status, and regression risk.`,
      config: {
        systemInstruction: FORGEMATE_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rootCause: { type: Type.STRING, description: "A concise technical explanation of the failure." },
            confidence: { type: Type.NUMBER, description: "Confidence score between 0.0 and 1.0" },
            suspectedFile: { type: Type.STRING, description: "Relative path to the file causing the issue." },
            evidence: { type: Type.STRING, description: "The specific log line or error message used as proof." },
            recurringPattern: { type: Type.STRING, description: "Notes on if this failure resembles previous runs (e.g. 'Seen 3x this week')." },
            architecturalSuggestion: { type: Type.STRING, description: "Improvement suggestion for code structure if relevant." },
            flakyTestDetected: { type: Type.BOOLEAN, description: "True if the failure appears to be a flaky test." },
            dependencyStatus: { type: Type.STRING, description: "Report on dependency freshness/CVEs (e.g., 'All clear' or 'lodash vulnerable')." },
            regressionRisk: { type: Type.STRING, description: "Estimated risk of regression (Low/Medium/High) with short reason." }
          },
          required: [
            "rootCause", 
            "confidence", 
            "suspectedFile", 
            "evidence", 
            "recurringPattern", 
            "architecturalSuggestion", 
            "flakyTestDetected", 
            "dependencyStatus", 
            "regressionRisk"
          ]
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
      evidence: "N/A",
      recurringPattern: "Unknown",
      architecturalSuggestion: "N/A",
      flakyTestDetected: false,
      dependencyStatus: "Unknown",
      regressionRisk: "Unknown"
    };
  }
};

export const generatePatch = async (
  analysis: AnalysisResult,
  codeContext: string,
  model: string = "gemini-2.5-flash",
  budget: number = 0,
  agentConfig?: AgentConfig
): Promise<PatchProposal> => {
  const ai = getAiClient();

  const config: any = {
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
  };

  // Apply thinking budget only for 2.5 series if requested
  if (model.includes('gemini-2.5') && budget > 0) {
      config.thinkingConfig = { thinkingBudget: budget };
  }

  let prompt = `Generate a minimal, safe patch for the following issue.
      
  Issue: ${analysis.rootCause}
  File: ${analysis.suspectedFile}
  Is Flaky: ${analysis.flakyTestDetected ? 'YES' : 'NO'}
  Recurring Pattern Context: ${analysis.recurringPattern || 'None'}
  
  Current Code Content:
  ${codeContext}`;

  if (agentConfig) {
      prompt += `\n\nACTIVE GUARDRAILS (YOU MUST COMPLY):
      - Blocked File Patterns: ${JSON.stringify(agentConfig.blockedFilePatterns)}
      - Sensitive Data Patterns: ${JSON.stringify(agentConfig.sensitivePatterns)}
      
      Directives:
      1. If the 'suspectedFile' matches any Blocked File Pattern, DO NOT generate a patch. Return an explanation stating the file is restricted.
      2. Ensure no sensitive data matching the Sensitive Patterns is included in the diff.
      `;
  }

  prompt += `\nProvide the fix, an explanation, and a verification test case.`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: config
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

export const chatWithAgent = async (
  history: {role: 'user' | 'model', content: string}[], 
  message: string,
  context?: string
): Promise<string> => {
    const ai = getAiClient();
    
    // Inject the current working context into the system instruction for the chat session
    const systemInstruction = context 
      ? `${FORGEMATE_SYSTEM_INSTRUCTION}\n\nCURRENT WORKING CONTEXT (Focus your answer on this if relevant):\n${context}`
      : FORGEMATE_SYSTEM_INSTRUCTION;

    try {
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: systemInstruction
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