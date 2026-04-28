declare global {
	const Bun: {
		file(path: string): {
			readonly size: number;
			exists(): Promise<boolean>;
			json<T>(): Promise<T>;
			text(): Promise<string>;
		};
		write(path: string, content: string | Uint8Array): Promise<void>;
	};
}

export {};
