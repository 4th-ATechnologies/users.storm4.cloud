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
	UserProfile,
	PubKey
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
import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import Typography from '@material-ui/core/Typography';

import AccountCircleIcon from '@material-ui/icons/AccountCircle';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import ReportProblemIcon from '@material-ui/icons/ReportProblem';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

const log = Logger.Make('debug', 'Send');

const AVATAR_SIZE = 96;

const styles: StyleRulesCallback = (theme: Theme) => createStyles({
	root: {
		display: 'flex',
		flexDirection: 'column',
		flexWrap: 'nowrap',
		justifyContent: 'center',
		alignItems: 'center',
		alignContent: 'center',
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
		paddingRight: theme.spacing.unit,
	//	backgroundColor: 'pink'
	},
	section_identity_avatar: {
		flexBasis: 'auto',
		width: AVATAR_SIZE,
		height: AVATAR_SIZE,
		boxShadow: '#C1C1C1 0px 0px 2px'
	},
	section_identity_avatar_img: {
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
	section_identity_name: {
		marginBottom: theme.spacing.unit
	},
	identityProviderImg: {
		backgroundColor: 'rgb(255,255,255)',
		paddingLeft: 6,
		paddingRight: 6,
		paddingTop: 3,
		paddingBottom: 3,
		borderRadius: 3
	},
	section_expansionPanels: {
		marginTop: theme.spacing.unit * 2,
		maxWidth: 600,
	},
	section_expansionPanel_summary: {
		display: 'flex',
		flexDirection: 'row',
		flexWrap: 'nowrap',
		justifyContent: 'center',
		alignItems: 'center',
		alignContent: 'center',
	},
	section_expansionPanel_summary_text: {
		marginLeft: theme.spacing.unit * 2
	},
	span_underline: {
		textDecoration: 'underline'
	},
	a_noLinkColor: {
		color: 'inherit'
	}
});

interface ISendProps extends RouteComponentProps<any>, WithStyles<typeof styles> {
	user_id     : string,
	identityID ?: string
}

interface ISendState {

	// User profile (region, bucket & auth0 identities)
	// 
	is_fetching_user_profile : boolean,
	user_profile              : UserProfile|null,
	user_profile_identity_idx : number|null,
	user_profile_err_msg      : string|null,

	// Public key
	// 
	is_fetching_public_key : boolean,
	public_key             : PubKey|null,
	public_key_err_msg     : string|null
}

class Send extends React.Component<ISendProps, ISendState> {

	public state: ISendState = {
		is_fetching_user_profile  : false,
		user_profile              : null,
		user_profile_identity_idx : null,
		user_profile_err_msg      : null,

		is_fetching_public_key    : false,
		public_key                : null,
		public_key_err_msg        : null
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
			log.debug("fetchUserProfile: user_profile: "+ JSON.stringify(user_profile, null, 2));

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

				}, ()=> {

					this.fetchPublicKey();
				});
			}
		});
	}

	public fetchPublicKey = ()=> {
		log.debug("fetchPublicKey()");

		const user_profile = this.state.user_profile;
		if (user_profile == null) {
			return;
		}

		const url = util.pubKeyUrlForUser(user_profile.s4);

		fetch(url, {
			method: 'GET'

		}).then((response)=> {

			if (response.status != 200)
			{
				log.err("Error fetching pubKey: "+ response.status);

				this.setState({
					is_fetching_public_key : false,
					public_key_err_msg     : "User's public key not found!"
				});
				return;
			}

			return response.json();

		}).then((json)=> {

			log.debug("pubKey JSON: "+ JSON.stringify(json, null, 2));

			this.setState({
				is_fetching_public_key : false,
				public_key             : json
			});

		}).catch((reason)=> {

			log.err("Error fetching pubKey: "+ reason);

			this.setState({
				is_fetching_public_key : false,
				public_key_err_msg     : "User's public key not found! Check internet connection."
			});
			return;
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
						<AccountCircleIcon className={classes.section_identity_avatar_img}/>
					</Avatar>
					<div className={classes.section_identity_fetching}>
						<CircularProgress
							className={classes.section_identity_fetching_progress}
							color="primary"
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

			const idpUrl = util.imageUrlForIdentityProvider_signin(identity);
			const idUrl = util.imageUrlForIdentity(identity, user_profile.s4);
			const displayName = util.displayNameForIdentity(identity, user_profile.s4);

			return (
				<div className={classes.section_identity}>
					<Avatar className={classes.section_identity_avatar}>
						<ReactImageFallback
							src={idUrl || undefined}
							initialImage={
								<AccountCircleIcon color="primary" className={classes.section_identity_avatar_img}/>
							}
							fallbackImage={
								<AccountCircleIcon color="primary" className={classes.section_identity_avatar_img}/>
							}
							width={AVATAR_SIZE}
							height={AVATAR_SIZE}
						/>
					</Avatar>
					<div className={classes.section_identity_nameAndProvider}>
						<Typography variant="headline" className={classes.section_identity_name}>
							{displayName}
						</Typography>
						<img src={idpUrl} height="22" className={classes.identityProviderImg}/>
					</div>
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

	public renderExpansionPanel1(): React.ReactNode {
		const state = this.state;
		const {classes} = this.props;

		const user_id = this.props.user_id;
		const user_profile = state.user_profile;

		let displayName = user_id;
		if (user_profile)
		{
			const identityIdx = this.getIdentityIdx();
			const identity = user_profile.auth0.identities[identityIdx];

			displayName = util.displayNameForIdentity(identity, user_profile.s4);
		}

		const profileUrl = util.profileUrlForUser(user_id);

		let pubKeyUrl: string|null = null;
		if (user_profile) {
			pubKeyUrl = util.pubKeyUrlForUser(user_profile.s4);
		}

		let section_li_pubKey;
		if (pubKeyUrl) {
			section_li_pubKey = (
				<li>
					<Typography>
						The user's public key is <a href={pubKeyUrl} className={classes.a_noLinkColor}>here</a>.
					</Typography>
				</li>
			)
		}

		let section_summary: React.ReactNode;
		if (state.is_fetching_public_key)
		{
			section_summary = (
				<div className={classes.section_expansionPanel_summary}>
					<CircularProgress
						color="secondary"
						size={16}
					/>
					<Typography className={classes.section_expansionPanel_summary_text}>
						{"Fetching user's public key..."}
					</Typography>
				</div>
			);
		}
		else if (state.public_key_err_msg)
		{
			section_summary = (
				<div className={classes.section_expansionPanel_summary}>
					<ReportProblemIcon color="error"/>
					<Typography className={classes.section_expansionPanel_summary_text}>
						{state.public_key_err_msg || "Generic error message"}
					</Typography>
				</div>
			);
		}
		else
		{
			section_summary = (
				<div className={classes.section_expansionPanel_summary}>
					<CheckCircleIcon nativeColor='green' />
					<Typography className={classes.section_expansionPanel_summary_text}>
						{"Fetched user's public key"}
					</Typography>
				</div>
			);
		}

		const section_details = (
			<div>
				<Typography>
					<p>
						Every Storm4 user has a public/private key pair.
						The private key is known <span className={classes.span_underline}>ONLY</span> to
						the user. (The server does not know it.)
					</p>
					<p>
						We're going to use the public key when encrypting the file. 
						This ensures that only "{displayName}" can decrypt it.
						The file is encrypted in your browser, and then the encrypted
						version is uploaded to the cloud.
					</p>
				</Typography>
				<ul>
					<li>
						<Typography>
							The user's public profile is <a href={profileUrl} className={classes.a_noLinkColor}>here</a>.
						</Typography>
					</li>
					{section_li_pubKey}
				</ul>
			</div>
		);

		return (
			<ExpansionPanel>
				<ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
					{section_summary}
				</ExpansionPanelSummary>
				<ExpansionPanelDetails>
					{section_details}
				</ExpansionPanelDetails>
			</ExpansionPanel>
		);
	}
	
	public render(): React.ReactNode {
		const state = this.state;
		const {classes} = this.props;

		const section_userProfile = this.renderUserProfile();

		if (state.user_profile == null)
		{
			return (
				<div className={classes.root}>
					{section_userProfile}
				</div>
			);
		}
		else
		{
			const section_expantionPanel1 = this.renderExpansionPanel1();

			return (
				<div className={classes.root}>
					{section_userProfile}
					<div className={classes.section_expansionPanels}>
						{section_expantionPanel1}
					</div>
				</div>
			);
		}
	}

	public componentDidMount() {
		log.debug("componentDidMount()");

		this.fetchUserProfile();
	}
}

export default withStyles(styles)(withRouter(Send));