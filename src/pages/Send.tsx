import * as React from 'react';
import * as _ from 'lodash';

import ReactImageFallback from 'react-image-fallback';

import {RouteComponentProps} from 'react-router';
import {withRouter} from 'react-router-dom'

import * as util from '../util/Util';
import * as users_cache from '../util/UsersCache';

import {Logger} from '../util/Logging'

import {
	UserInfo,
	Auth0Identity,
	Auth0Profile,
	UserProfile
} from '../models/users'

// Material UI

import {
	createStyles,
	StyleRulesCallback,
	Theme,
	withStyles,
	WithStyles 
} from '@material-ui/core/styles';

import Avatar from '@material-ui/core/Avatar';
import CircularProgress from '@material-ui/core/CircularProgress';
import Typography from '@material-ui/core/Typography';

import AccountCircleIcon from '@material-ui/icons/AccountCircle';


const log = Logger.Make('debug', 'Send');

const AVATAR_SIZE = 128;

const styles: StyleRulesCallback = (theme: Theme) => createStyles({
	root: {
		margin: 0,
		padding: 0
	},
	section_identity: {
		display: 'flex',
		flexDirection: 'row',
		flexWrap: 'nowrap',
		justifyContent: 'center',
		alignItems: 'center',
		alignContent: 'center',
		maxWidth: 400,
		margin: 0,
		paddingTop: 0,
		paddingBottom: 0,
		paddingLeft: theme.spacing.unit,
		paddingRight: theme.spacing.unit
	},
	section_identity_avatar: {
		flexBasis: 'auto',
		width: AVATAR_SIZE,
		height: AVATAR_SIZE
	},
	section_identity_fetching: {
		flexBasis: 'auto',
		display: 'flex',
		flexDirection: 'row',
		flexWrap: 'nowrap',
		justifyContent: 'center',
		alignItems: 'center',
		alignContent: 'center',
		marginLeft: theme.spacing.unit * 2,
	},
	section_identity_fetching_progress: {
		marginRight: theme.spacing.unit * 2
	},
	section_identity_nameAndProvider: {
		flexBasis: 'auto',
		marginLeft: theme.spacing.unit * 2,
		marginRight: theme.spacing.unit * 2
	},
	section_identity_nameAndProvider_progress: {

	}
});

interface ISendProps extends RouteComponentProps<any>, WithStyles<typeof styles> {
	user_id     : string,
	identityID ?: string
}

interface ISendState {
	is_fetching_user_profile : boolean,
	user_profile              : UserProfile|null,
	user_profile_identity_idx : number|null,
	user_profile_err_msg      : string,
}

class Send extends React.Component<ISendProps, ISendState> {

	public state: ISendState = {
		is_fetching_user_profile  : false,
		user_profile              : null,
		user_profile_identity_idx : null,
		user_profile_err_msg      : '',
	}

	protected getIdentityIdx = (): number => {

		const user_profile = this.state.user_profile;
		if (user_profile == null) {
			return 0;
		}

		const manually_selected_idx = this.state.user_profile_identity_idx;
		if (_.isNumber(manually_selected_idx)) {
			return manually_selected_idx;
		}
		
		// - this.props.identityID:
		// 	This is the ID that was displayed via the search results.
		//    We use it to maintain a consistent experience.
		// 
		// - user_profile.auth0.user_metadata.preferedAuth0ID
		// 	This is what the user has selected as their default identity.

		const search_id =
			this.props.identityID ||
			user_profile.auth0.user_metadata.preferedAuth0ID ||
			user_profile.auth0.user_metadata.preferredAuth0ID;

		if (search_id)
		{
			let identityIdx = 0;
			for (const identity of user_profile.auth0.identities)
			{
				const identityID = `${identity.provider}|${identity.user_id}`;
				if (identityID == search_id)
				{
					return identityIdx;
				}

				identityIdx++;
			}
		}

		return 0;
	}

	protected fetchUserProfile = ()=> {
		log.debug("fetchUserProfile()");

		users_cache.fetchUserProfile(this.props.user_id, (err, status_code, user_profile)=> {

			log.debug("fetchUserProfile: err: "+ err);
			log.debug("fetchUserProfile: status_code: "+ status_code);
			log.debug("fetchUserProfile: user_profile: "+ user_profile);

			let err_msg: string|null = null;
			if (err)
			{
				err_msg = "Unable to fetch user. Check internet connection.";
			}
			else if (status_code != 200 || user_profile == null)
			{
				err_msg = (status_code == 404)
				  ? "User not found. The userID may be incorrect, or the user may have deleted their account."
				  : "User not found. The server may be experiencing technical difficulties."
			}

			if (err_msg)
			{
				this.setState({
					is_fetching_user_profile : false,
					user_profile_err_msg     : err_msg
				});
				return;
			}
			else
			{
				this.setState({
					is_fetching_user_profile : false,
					user_profile             : user_profile!
				});
			}
		});
	}

	public renderUserProfile(): React.ReactNode {
		const state = this.state;
		const {classes} = this.props;

		if (state.is_fetching_user_profile)
		{
			return (
				<div className={classes.section_identity}>
					<Avatar className={classes.section_identity_avatar}>
						<AccountCircleIcon className={classes.section_identity_avatar}/>
					</Avatar>
					<div className={classes.section_identity_fetching}>
						<CircularProgress
							className={classes.section_identity_fetching_progress}
							color="secondary"
							size={16}
						/>
						<Typography variant="headline">
							{'Fetching user...'}
						</Typography>
					</div>
				</div>
			);
		}
		else if (state.user_profile_err_msg)
		{
			return (
				<div className={classes.section_identity}>
					<Typography variant="headline">
						{state.user_profile_err_msg}
					</Typography>
				</div>
			);
		}
		else if (state.user_profile)
		{
			const user_profile = state.user_profile;

			const identityIdx = this.getIdentityIdx();
			const identity = user_profile.auth0.identities[identityIdx];

			return (
				<div className={classes.section_identity}>
					<Avatar className={classes.section_identity_avatar}>
						<ReactImageFallback
							src={undefined}
							initialImage={
								<AccountCircleIcon color="primary"/>
							}
							fallbackImage={
								<AccountCircleIcon color="primary"/>
							}
							width={AVATAR_SIZE}
							height={AVATAR_SIZE}
						/>
					</Avatar>
				</div>
			);
		}
		else
		{
			return (
				<div className={classes.section_identity}></div>
			);
		}
	}
	
	public render(): React.ReactNode {
		const state = this.state;
		const {classes} = this.props;

		const userProfileSection = this.renderUserProfile();

		return (
			<div className={classes.root}>
				{userProfileSection}
			</div>
		);
	}

	public componentDidMount() {
		log.debug("componentDidMount()");

		this.fetchUserProfile();
	}
}

export default withStyles(styles)(withRouter(Send));