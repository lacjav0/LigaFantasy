const { request, gql } = require('graphql-request');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const SORARE_API_URL = 'https://api.sorare.com/graphql';

const INTROSPECT = gql`
  query Introspect {
    __type(name: "PlayerConnection") {
      name
      fields {
        name
        type { name kind }
      }
    }
    __type(name: "Player") {
      name
      fields {
        name
      }
    }
  }
`;

async function test() {
    try {
        const data = await request(SORARE_API_URL, INTROSPECT);
        console.log('PlayerConnection Fields:', JSON.stringify(data.__type.fields, null, 2));
        console.log('Player Fields include displayName:', data.__type.fields.some(f => f.name === 'displayName'));
    } catch (error) {
        console.error('Introspection Failed:', error.message);
    }
}

test();
