declare module "jstat" {
  interface Distribution {
    cdf(value: number, ...parameters: number[]): number;
    inv(probability: number, ...parameters: number[]): number;
  }

  const jstat: {
    mean(values: number[]): number;
    variance(values: number[], flag?: boolean): number;
    centralf: Distribution;
    chisquare: Distribution;
    normal: Distribution;
    studentt: Distribution;
  };

  export default jstat;
}
