import React, { Component } from 'react';
import Runtime from '../../utils/runtime';
import { removeCookie } from '../../utils/cookies';
import { AccountDropdown } from './AccountDropdown';
import { fetchProfile } from '../../utils/userInfo';

import { getUsername, getToken } from '../../utils/auth';

interface State {
  avatarOption: string | undefined;
  gravatarDefault: string | undefined;
  env: string | undefined;
  envIcon: string | undefined;
  username: string | null;
  realname: string | null;
  gravatarHash: string;
  signedout: boolean;
}

interface Props {
  title: string;
}

const HEADER_ICONS: { [key: string]: string } = {
  ci: 'fa-flask',
  next: 'fa-bullseye',
  'narrative-dev': 'fa-thumbs-up',
  'narrative-refactor': 'fa-thumbs-up',
  narrative: '',
  appdev: 'fa-wrench',
};

export class Header extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      avatarOption: undefined,
      gravatarDefault: undefined,
      env: undefined,
      envIcon: undefined,
      username: null,
      realname: null,
      gravatarHash: '',
      signedout: false,
    };
    this.getUserID = this.getUserID.bind(this);
    this.setUrlPrefix = this.setUrlPrefix.bind(this);
    this.getUserInfo = this.getUserInfo.bind(this);
    this.signOut = this.signOut.bind(this);
  }

  componentDidMount() {
    // TODO: AKIYO setUrlPrefix setting the state calling getUserID second time.
    // make change to stop second call
    this.setUrlPrefix();
    this.getUserID();
  }

  componentDidUpdate(prevProps: Props, prevState: State) {}

  getUserID() {
    const token = getToken();
    if (!token) {
      this.setState({ signedout: true });
      return;
    }
    getUsername((username) => {
      if (typeof username === 'string') {
        window._env.username = username;
        this.getUserInfo(window._env.username);
      }
    });
  }

  setUrlPrefix() {
    const icon: string[] = ['fa', 'fa-2x'];
    const matches = Runtime.getConfig().host_root.match('//([^.]+).kbase.us');
    let prefix: string = '';
    let env: string = 'ci';
    if (matches !== null) {
      env = matches[1];
    }

    if (env in HEADER_ICONS) {
      icon.push(HEADER_ICONS[env]);
      prefix = env.toUpperCase();
    } else {
      icon.push(HEADER_ICONS.ci);
    }
    this.setState({ env: prefix, envIcon: icon.join(' ') });
  }

  async getUserInfo(username: string) {
    if (!username || !username.length) {
      return;
    }
    const res = await fetchProfile(username);
    if (res) {
      const avatarOption = res.profile.userdata.avatarOption;
      const gravatarHash = res.profile.synced.gravatarHash;
      const gravatarDefault =
        res.profile.userdata.gravatarDefault || 'identicon';
      const username = res.user.username;
      const realname = res.user.realname;
      this.setState({
        avatarOption,
        gravatarDefault,
        gravatarHash,
        realname,
        username,
      });
    }
  }

  // Set gravatarURL
  gravatarSrc() {
    if (this.state.avatarOption === 'silhouette' || !this.state.gravatarHash) {
      let origin = Runtime.getConfig().host_root;
      if (origin !== location.origin) {
        origin = '';
      }
      return origin + window._env.urlPrefix + '/static/images/nouserpic.png';
    } else if (this.state.gravatarHash) {
      return (
        'https://www.gravatar.com/avatar/' +
        this.state.gravatarHash +
        '?s=300&amp;r=pg&d=' +
        this.state.gravatarDefault
      );
    }
    return '';
  }

  signOut() {
    const token = getToken();
    if (!token) {
      console.warn('Tried to sign out a user with no token.');
      return;
    }
    const headers = {
      Authorization: token,
      Accept: 'application/json',
    };
    fetch(Runtime.getConfig().service_routes.auth + '/logout', {
      method: 'POST',
      headers,
    })
      .then((resp) => {
        if (resp.ok) {
          // Remove the cookie
          removeCookie('kbase_session');
          // Redirect to the legacy signed-out page
          window.location.href =
            Runtime.getConfig().host_root + '/#auth2/signedout';
        } else {
          throw new Error(`${resp.status}: Failed to log out`);
        }
      })
      .catch((err) => {
        console.error('Error signing out: ' + err);
      });
  }

  render() {
    let envBadge = null;
    if (this.state.env !== 'NARRATIVE') {
      envBadge = <EnvBadge env={this.state.env} envIcon={this.state.envIcon} />;
    }
    return (
      <div>
        <h1 className="roboto-header">{this.props.title}</h1>
        <div
          className="flex top-0 right-0 absolute h-100"
          style={{ marginRight: '4px' }}
        >
          {envBadge}
          <AccountDropdown
            username={this.state.username}
            realname={this.state.realname}
            gravatarURL={this.gravatarSrc()}
            onSignOut={this.signOut}
            signedout={this.state.signedout}
          />
        </div>
      </div>
    );
  }
}

interface EnvBadgeProps {
  env?: string;
  envIcon?: string;
}

const EnvBadge: React.SFC<EnvBadgeProps> = (props) => {
  return (
    <div
      className="tc"
      style={{
        border: '1px silver solid',
        padding: '3px',
        margin: '2px',
        height: '58px',
        minWidth: '34px',
        alignSelf: 'center',
        marginRight: '24px',
      }}
    >
      <div
        style={{
          fontSize: '14px',
          fontWeight: 'bold',
          paddingBottom: '4px',
        }}
      >
        {props.env}
      </div>
      <i
        className={props.envIcon}
        style={{ color: '#2196F3', fontSize: '28px' }}
      ></i>
    </div>
  );
};
