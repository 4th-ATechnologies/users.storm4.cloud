declare module 'react-image-fallback' {
	import * as React from 'react';

	export type ReactImageFallbackFallbackImage = string | React.ReactElement<any> | any[];

	export type ReactImageFallbackInitialImage = string | React.ReactElement<any>;

	export interface ReactImageFallbackProps extends React.ImgHTMLAttributes<any> {
		 src?: string;
		 fallbackImage: ReactImageFallbackFallbackImage;
		 initialImage?: ReactImageFallbackInitialImage;
		 onLoad?: (...args: any[])=>any;
		 onError?: (...args: any[])=>any;
		 initialTimeout?: number;
	}

	export default class ReactImageFallback extends React.Component<ReactImageFallbackProps, any> {
		 render(): JSX.Element;

	}

}
