import axios from 'axios';
import { showAlert } from './alerts';
const stripe = Stripe(
  'pk_test_51RT0q6QtrXGvaMSN88o9nId2BOoeRsCO2geLdLAn5GQnzFJkAQjyTtc0MxZSfPmgeBxUrzeWN3v2LuwosoRBt6rX00RWYEQOJY'
);

export const bookTour = async (tourId) => {
  try {
    // 1) get checkout session from the server
    const session = await axios({
      url: `/api/v1/bookings/checkout-session/${tourId}`,
      // withCredentials: true,
    });
    // console.log(session);
    // 2) create checkout form + chrage credit card form
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    const message =
      err.response && err.response.data && err.response.data.message
        ? err.response.data.message
        : 'An error occurred. Please try again!';
    showAlert('error', message);
  }
};
