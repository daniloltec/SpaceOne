declare module "nodemailer" {
  interface Transporte {
    sendMail(mensagem: { from: string; to: string; subject: string; text: string }): Promise<unknown>;
  }

  interface Opcoes {
    host: string;
    port: number;
    secure: boolean;
    auth?: { user: string; pass: string };
  }

  function createTransport(opcoes: Opcoes): Transporte;

  export = { createTransport };
}
