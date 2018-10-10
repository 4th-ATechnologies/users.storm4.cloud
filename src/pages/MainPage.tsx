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

const log = (process.env.REACT_APP_STAGE == "dev") ?
	Logger.Make('Main', 'debug') :
	Logger.Make('Main', 'info');

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

		let user_id: string|null = null;

		const pathname = this.props.location.pathname;
		if (pathname.startsWith('/id/')) {
			user_id = pathname.substring(4);
		}

		if (user_id != null && util.isValidUserID(user_id))
		{
			return (
				<SendPage user_id={user_id} />
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