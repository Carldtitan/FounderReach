# Nebius Research Brief

Research date: 2026-07-13

## Hack scope

- Use because the hack gives Nebius credits/tokens and because it is real AI infrastructure.
- Best role in the project: model inference, GPU compute, or hosted AI workload execution.
- Use it only where it replaces something concrete: model calls, GPU-backed inference, fine-tuning/post-training, or AI app hosting.

## What it is

Nebius is AI cloud infrastructure. The official docs list GPU VMs, GPU clusters, Soperator/Slurm clusters, Kubernetes with GPU/InfiniBand support, object storage, PostgreSQL, container registry, Serverless AI, MLflow, turnkey AI apps, logs, metrics, traces, IAM, and quotas.

Plain English: Nebius is the compute/model layer. It is not the app database, agent workspace, or web data layer.

## Product surfaces that matter for this hack

- Managed inference / Token Factory: use hosted model endpoints instead of running your own model if speed matters.
- GPU VMs: use when you need control over an inference server, embedding model, worker, or custom ML service.
- GPU clusters: high-end option for distributed training/inference; almost certainly too heavy for a short hack unless Nebius staff gives a quick path.
- Serverless AI: endpoints and jobs for containerized AI workloads.
- Managed Kubernetes: useful only if the project already needs container orchestration.
- MLflow clusters: experiment tracking/model registry; probably not needed unless model iteration is the demo.
- Object Storage: S3-compatible storage for datasets and artifacts.
- PostgreSQL clusters: useful for ML/app data, but InsForge should probably be the main app DB to keep the stack simpler.
- Turnkey apps: JupyterLab, vLLM, Open WebUI, etc.

## Recent and beta-like features

Verified official information:

- Nebius AI Studio has been renamed Nebius Token Factory according to the Nebius Q1 2025 AI Studio roundup.
- Fine-tuning moved from beta to generally available in that roundup.
- The same roundup listed new models, prompt presets in Playground, higher rate limits, Hugging Face/Helicone/LlamaIndex/Postman integrations, and text-to-image generation.
- The Nebius compute page lists current NVIDIA-backed options including GB300 NVL72, HGX B300, HGX B200, HGX H200, HGX H100, and RTX PRO 6000.
- Nebius has a post-training limited beta/program under Token Factory, according to its post-training blog page.

## What to build with it

Use Nebius in the demo only if it gives a visible product benefit:

- run the primary model calls through Nebius Token Factory
- host an inference worker or embedding/reranking service
- run a GPU job that produces part of the user-facing result
- use Serverless AI for a background AI job

Good hack pattern:

1. Use InsForge for app/backend state.
2. Use Nimble for live web data.
3. Use Nebius for inference or compute-heavy processing.
4. Store Nebius outputs back into InsForge.
5. Use Kylon/BAND to show workflow and approvals.

## Risks and constraints

- Do not burn time launching a full GPU cluster unless the project genuinely needs it.
- Credits can disappear quickly on GPU workloads; default to managed inference/Token Factory if available.
- Fine-tuning/post-training is attractive but may be too slow for a one-day hack unless the Nebius team gives a guided path.
- If you already have a working model API path, adding Nebius only for sponsor optics may add infra risk.

## Sources

- Nebius AI Cloud docs: https://docs.nebius.com/
- Nebius Compute page: https://nebius.com/compute
- Nebius AI Studio Q1 2025 roundup: https://nebius.com/blog/posts/q1-2025-studio-updates
- Post-training by Nebius Token Factory: https://nebius.com/blog/posts/post-training-in-token-factory

