import { defineWebConfig } from '@kleinbem/web-config';

export default defineWebConfig({
	adapterOptions: {
		fallback: '200.html',
		pages: 'build',
		assets: 'build'
	}
});
