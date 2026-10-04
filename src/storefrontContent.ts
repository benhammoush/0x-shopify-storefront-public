export interface Collection {
  handle: string;
  name: string;
  eyebrow: string;
  description: string;
  art: 'signal' | 'thermal' | 'void';
}

export const collections: Collection[] = [
  { handle: 'transmissions', name: 'Transmissions', eyebrow: 'Drop 01', description: 'Uniforms for the signal between city blocks and late-night screens.', art: 'signal' },
  { handle: 'afterimage', name: 'Afterimage', eyebrow: 'Drop 02', description: 'Soft structures, hard contrast, and the trace left after motion.', art: 'thermal' },
  { handle: 'protocol', name: 'Protocol', eyebrow: 'Core line', description: 'Daily pieces engineered to repeat without becoming background.', art: 'void' },
];

export const manifesto = [
  ['01', 'Built for repeat', 'Small runs, durable fabrics, no disposable drops.'],
  ['02', 'Traceable matter', 'Material and production notes belong with every piece.'],
  ['03', 'Signal, not noise', 'Digital culture informs the work. It does not replace it.'],
] as const;
