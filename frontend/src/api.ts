
//Axios, frontend ve backend arasında veri alışverişi yapmanı sağlar.
//Fetch den daha iyi
import axios from 'axios';


const api = axios.create({
  baseURL: "http://localhost:8000"
});


export default api;