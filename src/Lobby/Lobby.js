import React, { Component } from 'react';
import { Modal } from 'react-modal-button';
import './Lobby.css';
const axios = require('axios');

class Lobby extends Component {

  constructor(props) {
    super(props);
    this.handlePlay = this.handlePlay.bind(this);
    this.handleGoToTheGame = this.handleGoToTheGame.bind(this);
    this.handleLogout = this.handleLogout.bind(this)
    this.APIGetGameList = this.APIGetGameList.bind(this);

    window.socket.on('match_ready', () => {
      clearInterval(this.searchTimer);
      this.setState({
        isSearching : false,
        isRoomReady: true,
      });
      setTimeout(()=>{
        this.handleGoToTheGame();
      }, 2000)
    });
    this.APIGetGameList(localStorage.getItem('token'));
    this.state = {
      isSearching: false,
      searchTime: 0,
      token: localStorage.getItem('token'),
      pastGames: [],
    };
  }

  APIGetGameList(token) {
    axios.get(`${process.env.REACT_APP_API_ENDPOINT}/past_games`, {
      headers: {
        'x-btoken': token
      }
    })
      .then(result => {
        //debugger
        this.setState({
          pastGames : result.data.games,
        })
      })
      .catch(e => {
        console.error("Eroor while getting the past games")
      })
  }

  handleGoToTheGame() {
    this.props.history.push('/game');
  }

  handlePlay() {
    //when a player clicks play, it create a new room or it will join an avaialble room
    // 1. Tell the server you are looking for a game
    window.socket.emit('join_lobby',{token : this.state.token});
    // 2. wait for someone to join
    this.searchTimer = setInterval(() => {
      this.setState({
        searchTime: this.state.searchTime + 1,
      });
    },1000);
    this.setState({
      isSearching : true,
      searchTime: 0,
    });
  }

  handleLogout() {
    localStorage.removeItem('token');
    window.location.assign('/login');
  }

  render() {
    let wins = 0;
    let losses = 0;
    this.state.pastGames.forEach((G) => {
      if (Boolean(G.didIwin)) wins++;
        else losses++;
    })
    return (
      <div className="Lobby">
      {this.state.isSearching ?
        <Modal isOpen={true}>
          Looking for a game, please be patient while we are looking for an oppenent.
          Searching for {this.state.searchTime} seconds
        </Modal>
      : null
      }
      {this.state.isRoomReady ?
        <Modal isOpen={true}>
          Get ready to play, the game is starting shortly
        </Modal>
      : null
      }
      {!this.state.isSearching && !this.state.isRoomReady ?
        <React.Fragment>
          <div className="Lobby-main">
            <div className="Lobby-main__playbutton">
              <button onClick={this.handlePlay} className="playButton" >Play!</button>
              <button onClick={this.handleLogout} className="playButton" >Logout</button>
            </div>
            <div className="Lobby-main__pastggames">
              Past games:
              <div className="Lobby-main__pastggames___list">
                <ul>
                  {
                    this.state.pastGames.map((G,k) => {
                      return <li key={`k${k}`} className={Boolean(G.didIwin)?"winner":"loser"}>{G.played}, {G.winner} </li>
                    })
                  }
                </ul>
              </div>
              <div className="Lobby-main__pastggames___stats">
                Total wins: {wins}  ({parseInt(wins*100/(wins+losses),10)}%) Losses: {losses}
              </div>
            </div>
          </div>
        </React.Fragment>
         : null
      }
      </div>
    );
  }
}

export default Lobby;
