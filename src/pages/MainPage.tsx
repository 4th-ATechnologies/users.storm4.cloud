import * as React from 'react';
import * as _ from 'lodash';

import {Redirect, Route, Switch, withRouter} from 'react-router-dom';
import {RouteComponentProps} from 'react-router';

import * as util from '../util/Util';

import SearchPage from './Search';
import SendPage from './Send';

import {Logger} from '../util/Logging';

// Material UI

import {
	createStyles,
	StyleRulesCallback,
	Theme,
	withStyles,
	WithStyles 
} from '@material-ui/core/styles';

const log = Logger.Make('debug', 'Main');

const styles: StyleRulesCallback = (theme: Theme) => createStyles({
	root: {
		margin: 0,
		padding: 0
	}
});

interface IMainProps extends RouteComponentProps<any>, WithStyles<typeof styles> {
}

interface IMainState {
	foobar: number
}

class Main extends React.Component<IMainProps, IMainState> {

	public render(): React.ReactNode
	{
		const state = this.state;
		const {classes} = this.props;

		let pathname = this.props.location.pathname;
		if (pathname.startsWith('/')) {
			pathname = pathname.substring(1);
		}
		
		log.debug("pathname: "+ pathname);

		if (util.isValidUserID(pathname))
		{
			return (
				<SendPage user_id={pathname} />
			);
		}
		else
		{
			return (
				<Switch>
					<Route path='/search' component={SearchPage}/>
					<Redirect to={`/search`} />
				</Switch>
			);
		}
	}

	public componentDidMount() {
		log.debug("componentDidMount()");
	}
}

export default withStyles(styles)(withRouter(Main));