export function isHandheldInstallTarget(input: {
  userAgent: string;
  finePointer: boolean;
  coarsePointer: boolean;
  narrow: boolean;
}): boolean {
  const uaMobile = /android|iphone|ipad|ipod|mobile/i.test(input.userAgent);
  if (input.finePointer && !uaMobile) return false;
  return uaMobile || (input.coarsePointer && input.narrow);
}
