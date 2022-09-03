const machine_name = 'rocketchat' //changeme
const machine_password = 'rocketchat' //changeme

class Script {
  prepare_outgoing_request({ request }) {
    const [cmd, verb, ip, ...args] = request.data.text.split(" ")
    // cmd=/cs|/crowdsec verb=check|ban|heartbeat ip=127.0.0.2 args=[limit,1000,duration,6h]
    const { result: res } = HTTP("POST",`${request.url}/watchers/login`, {
        data: {
            machine_id: machine_name,
            password: machine_password,
        },
        headers: {
            'Content-Type': `application/json`,
            'User-Agent': `crowdsec-rc/v0.1-rocketchat-integration`
        },
    })
    let parsedArgs =  Object.fromEntries(_.chunk(args,2))
    //This split [] into [[]] for example [limit,1000] with by [[limit,1000]] so Object fromEntries creates { limit: 1000 }
    let url = request.url
    let method = request.method
    request.params[`limit`] = parsedArgs[`limit`] || 100
    let data = {}
    switch(verb.toLowerCase()) {
        case "check":
            url += `/alerts`
            request.params[`ip`] = ip
            request.params[`include_capi`] = false
            method = `GET`
        break;
        case "heartbeat":
            url += `/heartbeat`
            method = `GET`
        break;
        default:
            return {
                message: {
                    text: `@${request.data.user_name} im here to help!`
                }
            }
    }
    return {
        url: `${url}${Object.keys(request.params).length > 0 ? `?${Object.keys(request.params).map(key => `${key}=${request.params[key]}`).join('&')}`:''}`,
        headers: {
            'X-Rocket-Chat-Data': JSON.stringify(request.data),
            'Authorization': `Bearer ${res.data.token}`,
            ...request.headers
        },
        method,
    };
  }
  process_outgoing_response({ request, response }) {
    if (response.status_code > 400) {
      let msg;
      switch (response.status_code) {
        case 400: msg = `JIRA returned a 500... not sure what to do with that.`; break;
        default: msg = `Got ${response.status_code} and the bot cannot handle that.`; break;
      }
      return {content: {text: `${msg}` }}
    }
    return {
        content: {
            text: `${response.content}`
        }
    }
  }
}
