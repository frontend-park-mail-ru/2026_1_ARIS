import { createRouter } from './router.js';
import { renderLogin } from './pages/login.js';
import { renderRegister } from './pages/register.js';
import { renderFeed } from './pages/feed.js';
import { renderProfile } from './pages/profile.js';

const root = document.getElementById('app');

const router = createRouter(root, [
  { path: '/', title: 'ARISNET — Feed', render: renderFeed },
  { path: '/feed', title: 'ARISNET — Feed', render: renderFeed },
  { path: '/login', title: 'ARISNET — Login', render: renderLogin },
  { path: '/register', title: 'ARISNET — Register', render: renderRegister },
  { path: '/profile', title: 'ARISNET — Profile', render: renderProfile },
]);

router.render();
