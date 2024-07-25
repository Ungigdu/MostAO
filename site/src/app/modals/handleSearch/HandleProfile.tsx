import {HANDLE_REGISTRY} from "../../util/consts";
import {HandleProfileType, MostAoActions} from "../../util/types";
import {generateAvatar, messageToAO} from "../../util/util";

let imgdata = "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20360%20360%22%20fill%3D%22none%22%20shape-rendering%3D%22auto%22%3E%3Cmetadata%20xmlns%3Ardf%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2F02%2F22-rdf-syntax-ns%23%22%20xmlns%3Axsi%3D%22http%3A%2F%2Fwww.w3.org%2F2001%2FXMLSchema-instance%22%20xmlns%3Adc%3D%22http%3A%2F%2Fpurl.org%2Fdc%2Felements%2F1.1%2F%22%20xmlns%3Adcterms%3D%22http%3A%2F%2Fpurl.org%2Fdc%2Fterms%2F%22%3E%3Crdf%3ARDF%3E%3Crdf%3ADescription%3E%3Cdc%3Atitle%3EAvatar%20Illustration%20System%3C%2Fdc%3Atitle%3E%3Cdc%3Acreator%3EMicah%20Lanier%3C%2Fdc%3Acreator%3E%3Cdc%3Asource%20xsi%3Atype%3D%22dcterms%3AURI%22%3Ehttps%3A%2F%2Fwww.figma.com%2Fcommunity%2Ffile%2F829741575478342595%3C%2Fdc%3Asource%3E%3Cdcterms%3Alicense%20xsi%3Atype%3D%22dcterms%3AURI%22%3Ehttps%3A%2F%2Fcreativecommons.org%2Flicenses%2Fby%2F4.0%2F%3C%2Fdcterms%3Alicense%3E%3Cdc%3Arights%3ERemix%20of%20%E2%80%9EAvatar%20Illustration%20System%E2%80%9D%20(https%3A%2F%2Fwww.figma.com%2Fcommunity%2Ffile%2F829741575478342595)%20by%20%E2%80%9EMicah%20Lanier%E2%80%9D%2C%20licensed%20under%20%E2%80%9ECC%20BY%204.0%E2%80%9D%20(https%3A%2F%2Fcreativecommons.org%2Flicenses%2Fby%2F4.0%2F)%3C%2Fdc%3Arights%3E%3C%2Frdf%3ADescription%3E%3C%2Frdf%3ARDF%3E%3C%2Fmetadata%3E%3Cmask%20id%3D%22viewboxMask%22%3E%3Crect%20width%3D%22360%22%20height%3D%22360%22%20rx%3D%220%22%20ry%3D%220%22%20x%3D%220%22%20y%3D%220%22%20fill%3D%22%23fff%22%20%2F%3E%3C%2Fmask%3E%3Cg%20mask%3D%22url(%23viewboxMask)%22%3E%3Cg%20transform%3D%22translate(80%2023)%22%3E%3Cpath%20d%3D%22M154%20319.5c-14.4-20-25.67-58.67-27-78L58.5%20212%2030%20319.5h124Z%22%20fill%3D%22%23ac6651%22%20stroke%3D%22%23000%22%20stroke-width%3D%224%22%2F%3E%3Cpath%20d%3D%22M130.37%20263.69c-2.1.2-4.22.31-6.37.31-30.78%200-56.05-21.57-58.76-49.1L127%20241.5c.38%205.48%201.55%2013.32%203.37%2022.19Z%22%20fill%3D%22%23000%22%20style%3D%22mix-blend-mode%3Amultiply%22%2F%3E%3Cpath%20d%3D%22M181.94%20151.37v.01l.1.4.14.65A75.72%2075.72%200%200%201%2034.93%20187.7l-.2-.74L18%20117.13l-.06-.29A75.72%2075.72%200%200%201%20165.2%2081.55l.05.21.02.08.05.2.05.2v.01l16.4%2068.44.08.34.08.34Z%22%20fill%3D%22%23ac6651%22%20stroke%3D%22%23000%22%20stroke-width%3D%224%22%2F%3E%3Cg%20transform%3D%22translate(34%20102.3)%22%3E%3C%2Fg%3E%3C%2Fg%3E%3Cg%20transform%3D%22translate(170%20183)%22%3E%3Cpath%20d%3D%22M13%2046c1.72-7.96%208.07-24.77%2019.77-28.35%2011.7-3.58%2017.7%208.46%2019.23%2014.92%22%20stroke%3D%22%23000000%22%20stroke-width%3D%224%22%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%22translate(110%20102)%22%3E%3Cpath%20d%3D%22M99%2010.21c5.67-2.66%2019-5.1%2027%206.5M23.58%2035.52c2.07-5.9%209.68-17.12%2023.56-14.7M26.07%2029.46l-6.14-5.43M122.96%2011.16l6.15-5.43M32.52%2023.81l-4.04-7.13M115.51%207.51l4.05-7.13M40.6%2020.2l-2.2-7.9M106.44%206.9l2.2-7.9%22%20stroke%3D%22%23000000%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%22translate(49%2011)%22%3E%3Cg%20fill%3D%22%23e0ddff%22%3E%3Cpath%20opacity%3D%22.1%22%20d%3D%22M187.99%2077.18c-8-6.4-21.84-7-27.5-6.5l-8-26.5c13.6%203.2%2032%2024%2035.5%2033Z%22%2F%3E%3Cpath%20d%3D%22M85.8%2011.76S91.52%207.8%20115.74%201.7c24.21-6.1%2033.04-3.72%2033.04-3.72l11.8%2072.84s-8.05-.18-28.04%204.19c-20%204.38-29.56%209.67-29.56%209.67l-17.2-72.9Z%22%2F%3E%3Cpath%20d%3D%22M48.99%2086.68c-6.8-41.6%2023.33-68.17%2037-75.5l16.98%2073.5c-19.2-39.6-45.33-15.17-54%202Z%22%2F%3E%3Cpath%20opacity%3D%22.1%22%20d%3D%22M67.49%20130.68c-7.2-27.2%2022-41.84%2035.5-46-7-16.34-23-31-42.5-13-18%2030.5-11%2054-5.5%2072l12.5-13Z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3Cg%20transform%3D%22translate(142%20119)%22%3E%3Ccircle%20cx%3D%2215.24%22%20cy%3D%2220.24%22%20r%3D%2212%22%20transform%3D%22rotate(-6.28%2015.24%2020.24)%22%20fill%3D%22%23ffedef%22%2F%3E%3Cellipse%20cx%3D%2216.53%22%20cy%3D%2229.4%22%20rx%3D%229%22%20ry%3D%2213.5%22%20transform%3D%22rotate(-6.78%2016.53%2029.4)%22%20fill%3D%22%23000000%22%2F%3E%3Ccircle%20cx%3D%2279.02%22%20cy%3D%2211.61%22%20r%3D%2212%22%20transform%3D%22rotate(-6.28%2079.02%2011.61)%22%20fill%3D%22%23ffedef%22%2F%3E%3Cellipse%20cx%3D%2280.53%22%20cy%3D%2219.4%22%20rx%3D%229%22%20ry%3D%2213.5%22%20transform%3D%22rotate(-6.28%2080.53%2019.4)%22%20fill%3D%22%23000000%22%2F%3E%3Cg%20transform%3D%22translate(-40%20-8)%22%3E%3C%2Fg%3E%3C%2Fg%3E%3Cg%20transform%3D%22rotate(-8%201149.44%20-1186.92)%22%3E%3Cpath%20d%3D%22M16.5%203c0%2014%207%2025%207%2025S20%2034%2010%2032%22%20stroke%3D%22%23000%22%20stroke-width%3D%224%22%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%22translate(84%20154)%22%3E%3Cpath%20d%3D%22M30.5%206.18A23.78%2023.78%200%200%200%2023.08%205c-10.5%200-19%206.5-18%2018.5%201.04%2012.5%208.5%2017%2019%2017A19.6%2019.6%200%200%200%2031%2039.23%22%20stroke%3D%22%23000%22%20stroke-width%3D%228%22%2F%3E%3Cpath%20d%3D%22M31.5%2039.04a19.38%2019.38%200%200%201-7.42%201.46c-10.5%200-17.96-4.5-19-17-1-12%207.5-18.5%2018-18.5%203.14%200%206.19.6%208.92%201.73l-.5%2032.3Z%22%20fill%3D%22%23ac6651%22%2F%3E%3Cpath%20d%3D%22M27.5%2013.5c-4-1.83-12.8-2.8-16%208%22%20stroke%3D%22%23000%22%20stroke-width%3D%224%22%2F%3E%3Cpath%20d%3D%22M17%2014c2.17%201.83%206.3%207.5%205.5%2015.5%22%20stroke%3D%22%23000%22%20stroke-width%3D%224%22%2F%3E%3Cg%20transform%3D%22translate(3%2035)%22%3E%3C%2Fg%3E%3C%2Fg%3E%3Cg%20transform%3D%22translate(53%20272)%22%3E%3Cg%20stroke%3D%22%23000%22%20stroke-width%3D%224%22%3E%3Cpath%20d%3D%22M126.77%2067.58%20128%2066l-1.23%201.58%201.72%201.34%201.19-1.83v-.02l.05-.06.04-.05a28.57%2028.57%200%200%201%20.8-1.18%20112.35%20112.35%200%200%201%2011.5-14.05c3.67-3.78%207.83-7.4%2012.13-9.93%204.31-2.53%208.58-3.84%2012.53-3.3C209.17%2044.2%20240.4%2063%20260.67%2091h-273.3c16.3-29.34%2039.49-48.02%2077.07-56.59%201.6-.36%203.78-.25%206.5.38%202.7.63%205.77%201.73%209.09%203.19%206.62%202.9%2014.02%207.16%2020.97%2011.56a355.78%20355.78%200%200%201%2025.24%2017.63l.4.3.1.08.02.02h.01Z%22%20fill%3D%22%23ffeba4%22%2F%3E%3Cpath%20d%3D%22m52.61%2037.08%205.17-19.23c.2-.78%201.22-1%201.76-.4C74.4%2033.7%2093.16%2033.08%2099.4%2032.33c.84-.1%201.5.82%201.1%201.58L87.34%2058.86c-.2.38-.62.6-1.04.5-3.95-.82-23.62-5.63-33.57-21.5a1%201%200%200%201-.12-.78ZM183.2%2036.98%20171.61%2017.5c-.4-.66-1.37-.65-1.79%200-5.73%208.83-15.63%2012.9-19.09%2014.1-.62.22-.9.96-.57%201.53l13.5%2022.81c.2.34.59.53.97.42%202.13-.61%209.46-3.67%2018.54-18.34a1%201%200%200%200%20.01-1.04Z%22%20fill%3D%22%23ffeba4%22%2F%3E%3Cpath%20d%3D%22m52.61%2037.08%205.17-19.23c.2-.78%201.22-1%201.76-.4C74.4%2033.7%2093.16%2033.08%2099.4%2032.33c.84-.1%201.5.82%201.1%201.58L87.34%2058.86c-.2.38-.62.6-1.04.5-3.95-.82-23.62-5.63-33.57-21.5a1%201%200%200%201-.12-.78ZM183.2%2036.98%20171.61%2017.5c-.4-.66-1.37-.65-1.79%200-5.73%208.83-15.63%2012.9-19.09%2014.1-.62.22-.9.96-.57%201.53l13.5%2022.81c.2.34.59.53.97.42%202.13-.61%209.46-3.67%2018.54-18.34a1%201%200%200%200%20.01-1.04Z%22%20fill%3D%22%23fff%22%20fill-opacity%3D%22.75%22%2F%3E%3Cpath%20d%3D%22m109.5%2054.5-9-21.5-7%2015%2016%206.5ZM141%2053.5l9-21.5%207%2015-16%206.5ZM70.5%2014l-12%203%2010%206.5%202-9.5ZM160%2014l11%203-7%206.5-4-9.5Z%22%20fill%3D%22%23000%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E"

export default function HandleProfile (props: {
  data: HandleProfileType;
  myHandleName: string;
}) {
  const {data, myHandleName} = props;
  const {name, handleName, pid} = data;

  const handleEstablishSession = async () => {
    try {
      const response = await messageToAO(
        HANDLE_REGISTRY,
        {handleA: myHandleName, handleB: handleName},
        MostAoActions.EstablishSession
      );
      console.log(response);
      if (response) {
        console.log("Session established successfully");
        // Optionally update chat history or provide feedback to the user
      } else {
        console.error("Failed to establish session:", response);
      }
    } catch (error) {
      console.error("Error establishing session:", error);
    }
  };

  return (
    <div className="handle-profile-list">
      <div className="handle-profile">
        <img src={generateAvatar(pid)} alt="current handle" className="avatar-small" />
        <span>{name || ''}</span>
        <span style={{
          color: '#888',
        }}>@{handleName}</span>
      </div>
      <button className='handle-profile-btn' onClick={handleEstablishSession}>
        Establish Session
      </button>
    </div>
  )
}

