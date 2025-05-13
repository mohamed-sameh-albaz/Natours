import axios from 'axios';
import { showAlert } from './alerts';

export const login = async (email, password) => {
  // console.log(email, password);
  console.log('Login');
  try {
    const res = await axios({
      method: 'POST',
      url: 'http://127.0.0.1:3000/api/v1/users/login',
      data: {
        email,
        password,
      },
      withCredentials: true,
    });
    console.log('data', res);
    if (res.data.status === 'success') {
      showAlert('success', 'Logged in successfully!');
      window.setTimeout(() => {
        location.assign('/');
      }, 1500);
    }
  } catch (err) {
    const message =
      err.response && err.response.data && err.response.data.message
        ? err.response.data.message
        : 'An error occurred. Please try again!';
    showAlert('error', message);
    console.log(err.response ? err.response.data : err);
  }
};

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: 'http://127.0.0.1:3000/api/v1/users/logout',
      withCredentials: true,
    });
    if (res.data.status === 'success') {
      location.reload(true); // true for avoiding load the same page again from the cache
    }
  } catch (err) {
    const message =
      err.response && err.response.data && err.response.data.message
        ? err.response.data.message
        : 'An error occurred. Please try again!';
    showAlert('error', message);
    console.log(err.response ? err.response.data : err);
  }
};
