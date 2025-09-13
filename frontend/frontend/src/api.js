import axios from 'axios';

// When running CRA dev server, add "proxy": "http://localhost:4000" in package.json.
// Then baseURL can stay '' and proxy will forward to 4000.
const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE || ''
});

export default api;
