export abstract class ImplCliError extends Error {
	abstract readonly code: string;
	readonly detail?: string;

	constructor(message: string, detail?: string, options?: { cause?: unknown }) {
		super(message, options);
		this.name = new.target.name;
		this.detail = detail;
		Object.setPrototypeOf(this, new.target.prototype);
	}

	toCliError(): {
		code: string;
		message: string;
		detail?: string;
	} {
		return {
			code: this.code,
			message: this.message,
			...(this.detail ? { detail: this.detail } : {}),
		};
	}
}
