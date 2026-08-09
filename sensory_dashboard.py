import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import folium
from folium.plugins import HeatMap
from streamlit_folium import st_folium

st.set_page_config(
    page_title="Sensory-Friendly Melbourne CBD",
    page_icon="🧭",
    layout="wide",
    initial_sidebar_state="expanded",
)


@st.cache_data(ttl=900, show_spinner="Loading live pedestrian counts...")
def load_past_hour():
    url = (
        "https://data.melbourne.vic.gov.au/api/v2/catalog/datasets/"
        "pedestrian-counting-system-past-hour-counts-per-minute/exports/csv?delimiter=%2C"
    )
    df = pd.read_csv(url)
    df["location_id"] = df["location_id"].astype(int)
    df["sensing_datetime"] = pd.to_datetime(
        df["sensing_datetime"], utc=True
    ).dt.tz_convert("Australia/Melbourne")
    for col in ["direction_1", "direction_2", "total_of_directions"]:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype(int)
    df = df.drop_duplicates(subset=["location_id", "sensing_datetime"])
    df["total_count"] = df["direction_1"] + df["direction_2"]
    df["density_level"] = pd.cut(
        df["total_count"],
        bins=[-1, 50, 150, np.inf],
        labels=["Low", "Medium", "High"],
    )
    df["hour"] = df["sensing_datetime"].dt.hour
    df["minute"] = df["sensing_datetime"].dt.minute
    return df


@st.cache_data(show_spinner="Loading historical counts (this might takes a while)...")
def load_hourly_historical():
    base_url = (
        "https://data.melbourne.vic.gov.au/api/v2/catalog/datasets/"
        "pedestrian-counting-system-monthly-counts-per-hour/exports/csv"
    )
    url = f"{base_url}?delimiter=,&where=sensing_date%20%3E%3D%20%272024-01-01%27"

    try:
        df = pd.read_csv(url)
    except Exception as e:
        st.error(f"Failed to load historical data: {e}")
        return pd.DataFrame()

    df.columns = df.columns.str.strip().str.lower()
    df["location_id"] = pd.to_numeric(df.get("location_id"), errors="coerce")
    df["hourday"] = pd.to_numeric(df.get("hourday"), errors="coerce")

    if "pedestriancount" in df.columns:
        count_col = "pedestriancount"
    elif "total_of_directions" in df.columns:
        count_col = "total_of_directions"
    elif "count" in df.columns:
        count_col = "count"
    else:
        possible = [c for c in df.columns if "count" in c or "pedestrian" in c]
        count_col = possible[0] if possible else df.columns[-1]

    df["pedestriancount"] = pd.to_numeric(df[count_col], errors="coerce").fillna(0)
    df["sensing_date"] = pd.to_datetime(df.get("sensing_date"), errors="coerce")
    df = df.dropna(subset=["location_id", "sensing_date", "hourday"])
    df["day_name"] = df["sensing_date"].dt.day_name()
    df["is_weekend"] = df["sensing_date"].dt.dayofweek >= 5
    df["year"] = df["sensing_date"].dt.year
    df["month"] = df["sensing_date"].dt.month
    return df


def _parse_coords(val):
    try:
        if pd.isna(val):
            return None, None
        parts = str(val).replace("[", "").replace("]", "").split(",")
        return float(parts[0].strip()), float(parts[1].strip())
    except (ValueError, IndexError, TypeError):
        return None, None


def _map_category(row):
    t = str(row.get("theme", "")).lower()
    s = str(row.get("sub_theme", "")).lower()
    if any(x in t or x in s for x in ["park", "garden", "reserve", "open space", "outdoor"]):
        return "Parks & Open Space"
    if any(x in t or x in s for x in ["church", "worship", "cathedral", "temple", "mosque"]):
        return "Places of Worship"
    if any(x in t or x in s for x in ["hospital", "health", "clinic"]):
        return "Health Services"
    if any(x in t or x in s for x in ["gallery", "museum", "theatre", "art"]):
        return "Arts & Culture"
    if any(x in t or x in s for x in ["school", "university", "education", "tertiary"]):
        return "Education"
    if any(x in t or x in s for x in ["sport", "stadium", "recreation"]):
        return "Sports Facilities"
    if any(x in t or x in s for x in ["station", "transport"]):
        return "Transport"
    return "Other"


@st.cache_data(show_spinner="Loading landmarks...")
def load_landmarks():
    url = (
        "https://data.melbourne.vic.gov.au/api/v2/catalog/datasets/"
        "landmarks-and-places-of-interest-including-schools-theatres-health-services-spor/"
        "exports/csv?delimiter=,"
    )

    try:
        df = pd.read_csv(url)
    except Exception as e:
        st.error(f"Failed to load landmarks: {e}")
        return pd.DataFrame()

    df.columns = df.columns.str.strip().str.lower()
    coords = df["co_ordinates"].apply(_parse_coords)
    df["latitude"] = coords.apply(lambda x: x[0])
    df["longitude"] = coords.apply(lambda x: x[1])
    df = df.dropna(subset=["latitude", "longitude"]).copy()

    quiet_keywords = [
        "park", "garden", "reserve", "library", "museum", "gallery",
        "church", "cathedral", "temple", "mosque", "synagogue",
        "hospital", "health", "quiet", "outdoor facility",
    ]
    pattern = "|".join(quiet_keywords)
    df["is_sensory_refuge"] = (
        df["sub_theme"].str.lower().str.contains(pattern, na=False)
        | df["theme"].str.lower().str.contains(pattern, na=False)
    )
    df["in_cbd"] = (
        df["latitude"].between(-37.825, -37.805)
        & df["longitude"].between(144.95, 144.98)
    )
    df["broad_category"] = df.apply(_map_category, axis=1)
    return df


st.sidebar.title("Sensory-Friendly CBD")
st.sidebar.markdown("Prototype dashboard for neurodivergent navigation")

page = st.sidebar.radio(
    "Choose section",
    [
        "Overview",
        "Live Density (Past Hour)",
        "Historical Patterns",
        "Quiet Windows",
        "Sensory Refuges Map",
    ],
)

st.sidebar.markdown("---")
st.sidebar.info("Data sources: City of Melbourne Open Data (CC BY 4.0)")

DAY_ORDER = [
    "Monday", "Tuesday", "Wednesday", "Thursday",
    "Friday", "Saturday", "Sunday",
]

if page == "Overview":
    df_live = load_past_hour()
    df_hist = load_hourly_historical()
    df_land = load_landmarks()

    st.title("Sensory-Friendly Melbourne CBD")
    st.markdown(
        "Real-time pedestrian density, historical quiet windows, and sensory "
        "refuge locations for navigating the CBD with less sensory overload."
    )

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Live records (last hour)", f"{len(df_live):,}")
    col2.metric("Unique sensors (live)", df_live["location_id"].nunique())
    col3.metric("Historical hourly rows", f"{len(df_hist):,}")
    col4.metric(
        "Sensory refuges",
        int(df_land["is_sensory_refuge"].sum()) if len(df_land) else 0,
    )

    st.subheader("Current Density Snapshot")
    density_counts = (
        df_live["density_level"].value_counts().reindex(["Low", "Medium", "High"])
    )
    fig = px.pie(
        values=density_counts.values,
        names=density_counts.index,
        color=density_counts.index,
        color_discrete_map={"Low": "#27ae60", "Medium": "#f39c12", "High": "#e74c3c"},
        title="Live Crowd Density Classification",
    )
    st.plotly_chart(fig, use_container_width=True)

elif page == "Live Density (Past Hour)":
    df_live = load_past_hour()

    st.title("Live Pedestrian Density (Past Hour)")

    col1, col2 = st.columns(2)
    with col1:
        st.subheader("Density Level Distribution")
        fig = px.histogram(
            df_live,
            x="density_level",
            category_orders={"density_level": ["Low", "Medium", "High"]},
            color="density_level",
            color_discrete_map={
                "Low": "#27ae60",
                "Medium": "#f39c12",
                "High": "#e74c3c",
            },
        )
        st.plotly_chart(fig, use_container_width=True)

    with col2:
        st.subheader("Total Volume Over Last Hour")
        ts = df_live.groupby("sensing_datetime")["total_count"].sum().reset_index()
        fig = px.line(ts, x="sensing_datetime", y="total_count", markers=True)
        st.plotly_chart(fig, use_container_width=True)

    st.subheader("Top 10 Busiest Sensors Right Now")
    top = (
        df_live.groupby("location_id")["total_count"]
        .sum()
        .sort_values(ascending=False)
        .head(10)
    )
    fig = px.bar(
        x=top.values,
        y=top.index.astype(str),
        orientation="h",
        labels={"x": "Total pedestrians", "y": "Sensor ID"},
    )
    fig.update_layout(yaxis={"categoryorder": "total ascending"})
    st.plotly_chart(fig, use_container_width=True)

    st.subheader("Count Distribution")
    fig = px.histogram(df_live, x="total_count", nbins=40, title="Minute-level counts")
    fig.add_vline(x=50, line_dash="dash", line_color="orange", annotation_text="Low/Med")
    fig.add_vline(x=150, line_dash="dash", line_color="red", annotation_text="Med/High")
    st.plotly_chart(fig, use_container_width=True)

elif page == "Historical Patterns":
    df_hist = load_hourly_historical()

    st.title("Historical Pedestrian Patterns (2024+)")

    if df_hist.empty:
        st.warning("Historical data could not be loaded.")
    else:
        daily = df_hist.groupby("sensing_date")["pedestriancount"].sum().reset_index()
        fig = px.line(
            daily,
            x="sensing_date",
            y="pedestriancount",
            title="Daily Total Pedestrian Volume",
        )
        st.plotly_chart(fig, use_container_width=True)

        col1, col2 = st.columns(2)
        with col1:
            hourly_avg = (
                df_hist.groupby("hourday")["pedestriancount"].mean().reset_index()
            )
            fig = px.bar(
                hourly_avg,
                x="hourday",
                y="pedestriancount",
                title="Average by Hour of Day",
            )
            st.plotly_chart(fig, use_container_width=True)

        with col2:
            pivot = df_hist.pivot_table(
                values="pedestriancount",
                index="hourday",
                columns="day_name",
                aggfunc="mean",
            )
            pivot = pivot.reindex(columns=[d for d in DAY_ORDER if d in pivot.columns])
            fig = px.imshow(
                pivot,
                aspect="auto",
                color_continuous_scale="YlOrRd",
                title="Heatmap: Hour x Day of Week",
            )
            st.plotly_chart(fig, use_container_width=True)

        st.subheader("Weekday vs Weekend Profile")
        wd = (
            df_hist.groupby(["is_weekend", "hourday"])["pedestriancount"]
            .mean()
            .reset_index()
        )
        wd["type"] = wd["is_weekend"].map({True: "Weekend", False: "Weekday"})
        fig = px.line(wd, x="hourday", y="pedestriancount", color="type", markers=True)
        st.plotly_chart(fig, use_container_width=True)

elif page == "Quiet Windows":
    df_hist = load_hourly_historical()

    st.title("Quiet Travel Windows")

    if df_hist.empty:
        st.warning("Historical data could not be loaded.")
    else:
        quiet = (
            df_hist.groupby(["day_name", "hourday"])["pedestriancount"]
            .agg(["mean", "median", "std", "count"])
            .reset_index()
            .sort_values("mean")
        )

        st.subheader("Top 15 Quietest Hour x Day Combinations")
        st.dataframe(
            quiet.head(15).style.format(
                {"mean": "{:.0f}", "median": "{:.0f}", "std": "{:.0f}"}
            )
        )

        st.subheader("Quiet Window Heatmap (lower = quieter)")
        pivot_q = quiet.pivot(index="hourday", columns="day_name", values="mean")
        pivot_q = pivot_q.reindex(
            columns=[d for d in DAY_ORDER if d in pivot_q.columns]
        )
        fig = px.imshow(
            pivot_q,
            color_continuous_scale="Greens_r",
            aspect="auto",
            title="Average volume (darker green = quieter)",
        )
        st.plotly_chart(fig, use_container_width=True)

elif page == "Sensory Refuges Map":
    df_land = load_landmarks()

    st.title("Sensory Refuge Locations")

    if df_land.empty:
        st.warning("Landmark data could not be loaded.")
    else:
        col1, col2 = st.columns([2, 1])

        with col2:
            st.metric("Total places", len(df_land))
            st.metric("Sensory refuges", int(df_land["is_sensory_refuge"].sum()))
            st.metric("Inside CBD", int(df_land["in_cbd"].sum()))

            st.subheader("Category breakdown")
            cat = df_land["broad_category"].value_counts()
            fig = px.bar(x=cat.values, y=cat.index, orientation="h")
            st.plotly_chart(fig, use_container_width=True)

        with col1:
            st.subheader("Map of Sensory Refuges")
            m = folium.Map(
                location=[-37.8136, 144.9631],
                zoom_start=13,
                tiles="CartoDB positron",
            )

            colour_map = {
                "Parks & Open Space": "green",
                "Places of Worship": "purple",
                "Health Services": "red",
                "Arts & Culture": "orange",
                "Education": "blue",
                "Sports Facilities": "darkgreen",
                "Transport": "gray",
                "Other": "cadetblue",
            }

            refuge_df = df_land[df_land["is_sensory_refuge"]]
            for _, row in refuge_df.iterrows():
                colour = colour_map.get(row["broad_category"], "green")
                folium.CircleMarker(
                    location=[row["latitude"], row["longitude"]],
                    radius=6,
                    color=colour,
                    fill=True,
                    fill_opacity=0.8,
                    popup=folium.Popup(
                        f"<b>{row.get('feature_name', 'Place')}</b><br>"
                        f"{row.get('sub_theme', '')}<br>"
                        f"Category: {row['broad_category']}",
                        max_width=250,
                    ),
                ).add_to(m)

            st_folium(m, width=700, height=500)

        st.subheader("All landmarks heatmap")
        m2 = folium.Map(
            location=[-37.8136, 144.9631],
            zoom_start=12,
            tiles="CartoDB dark_matter",
        )
        heat_data = df_land[["latitude", "longitude"]].dropna().values.tolist()
        HeatMap(heat_data, radius=15, blur=12).add_to(m2)
        st_folium(m2, width=900, height=450)

st.sidebar.markdown("---")
st.sidebar.caption("FIT5120 · open data prototype")
