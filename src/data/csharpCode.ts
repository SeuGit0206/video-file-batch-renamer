export interface CodeFile {
  name: string;
  path: string;
  language: string;
  content: string;
}

export interface PhaseInfo {
  id: number;
  title: string;
  description: string;
  files: CodeFile[];
}

export const phasesData: PhaseInfo[] = [
  {
    id: 1,
    title: 'Clean Architecture & Core Domain',
    description: 'C# Clean Architecture and Core Domain implementation',
    files: [
      {
        name: 'CompositionRoot.cs',
        path: 'src/CompositionRoot.cs',
        language: 'csharp',
        content: '// C# Production-ready composition root',
      },
    ],
  },
];
