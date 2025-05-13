import axios from 'axios';
import { showAlert } from './alerts';

// type is either password or data
export const updateSettings = async (data, type) => {
  console.log('update User data');
  try {
    const url =
      type === 'password'
        ? 'http://127.0.0.1:3000/api/v1/users/updateMyPassword'
        : 'http://127.0.0.1:3000/api/v1/users/updateMe';
    const res = await axios({
      method: 'PATCH',
      url,
      data,
      withCredentials: true,
    });
    console.log('data', res);
    if (res.data.status === 'success') {
      showAlert('success', `${type.toUpperCase()} Updated Successfully!`);
      window.setTimeout(() => {
        location.assign('/me');
      }, 500);
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
