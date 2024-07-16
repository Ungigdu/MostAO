export class AppConfig {
  public static siteName = 'Up Up';
  public static secretPassword = 'ploy';

  public static menu = [
    {
      text: 'Home',
      icon: 'home',
      to: '/',
      loggedIn: false
    },
    {
      text: 'Story',
      icon: 'story',
      to: '/story',
      beta: false,
      loggedIn: false
    },
    {
      text: 'Games',
      icon: 'games',
      to: '/games',
      loggedIn: false
    },
    {
      text: 'TokenEco',
      icon: 'token',
      to: '/token',
      beta: true,
      loggedIn: true
    },
    {
      text: 'Chatroom',
      icon: 'chatroom',
      to: '/chat',
      loggedIn: true
    },
    {
      text: 'Notifications',
      icon: 'notifications',
      to: '/notifications',
      new: true,
      loggedIn: true
    },
    {
      text: 'Bookmarks',
      icon: 'bookmarks',
      to: '/bookmarks',
      loggedIn: true
    },
    {
      text: 'Profile',
      icon: 'profile',
      to: '/profile',
      loggedIn: true
    },
  ];
}